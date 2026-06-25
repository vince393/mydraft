import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startEmailScheduler } from "./email-scheduler";
import { setupEmailSyncWebSocket } from "./ws-email-sync";
import { ensureCreditIndexes } from "./credits";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { validateEncryptionKey } from "./encryption";

const app = express();
const httpServer = createServer(app);

// Validate email encryption key on startup
validateEncryptionKey();

// Trust proxy for production (required for secure cookies behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Canonical-domain redirect: forward the built-in *.replit.app address to the
// custom domain so visitors and search engines only ever see the branded
// domain. Server-to-server paths (Stripe webhooks under /api, the Apple Pay
// domain-association file under /.well-known) are excluded so integrations
// registered against the replit.app host keep working.
const canonicalHost = (() => {
  try {
    return process.env.APP_BASE_URL
      ? new URL(process.env.APP_BASE_URL).host
      : "mydraft.io";
  } catch {
    return "mydraft.io";
  }
})();
app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase().split(":")[0];
  if (
    host.endsWith(".replit.app") &&
    host !== canonicalHost &&
    !req.path.startsWith("/api/") &&
    !req.path.startsWith("/.well-known/")
  ) {
    return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
  }
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Initialize Stripe schema and sync data on startup
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL required for Stripe integration');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      console.log(`Webhook configured: ${result?.webhook?.url || webhookBaseUrl + '/api/stripe/webhook'}`);
    } catch (webhookError) {
      console.log('Webhook setup skipped (will be configured on first event):', webhookError);
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: Error) => console.error('Error syncing Stripe data:', err));

    // Register our domain(s) with Stripe so Apple Pay / Google Pay buttons
    // render in Elements. Best-effort + idempotent: Stripe verifies the file
    // served at /.well-known/apple-developer-merchantid-domain-association.
    registerWalletDomains().catch(() => {});
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

async function registerWalletDomains() {
  const domains = (process.env.REPLIT_DOMAINS || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (domains.length === 0) return;

  try {
    const stripe = await getUncachableStripeClient();
    for (const domain of domains) {
      try {
        const existing = await stripe.paymentMethodDomains.list({
          domain_name: domain,
          limit: 1,
        });
        if (existing.data.length > 0) {
          // Re-validate in case the verification file became reachable later.
          await stripe.paymentMethodDomains
            .validate(existing.data[0].id)
            .catch(() => {});
        } else {
          await stripe.paymentMethodDomains.create({ domain_name: domain });
          console.log(`Registered wallet payment method domain: ${domain}`);
        }
      } catch (e: any) {
        console.log(
          `Wallet domain registration skipped for ${domain}:`,
          e?.message || e,
        );
      }
    }
  } catch (e: any) {
    console.log("Wallet domain registration unavailable:", e?.message || e);
  }
}

// Register Stripe webhook BEFORE express.json() - needs raw Buffer
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const ownDomains = (process.env.REPLIT_DOMAINS || "").split(",").map(d => d.trim()).filter(Boolean);
    const devDomain = process.env.REPLIT_DEV_DOMAIN || "";
    const mobileOrigins = process.env.MOBILE_APP_ORIGINS?.split(",").map(o => o.trim()).filter(Boolean) || [];

    const allowedOrigins = new Set<string>();
    for (const d of ownDomains) {
      allowedOrigins.add(`https://${d}`);
      allowedOrigins.add(`http://${d}`);
    }
    if (devDomain) {
      allowedOrigins.add(`https://${devDomain}`);
      allowedOrigins.add(`http://${devDomain}`);
    }
    for (const o of mobileOrigins) {
      allowedOrigins.add(o);
    }

    if (allowedOrigins.has(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
}));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const PgStore = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(
  session({
    store: new PgStore({
      pool: pgPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      const sensitiveAuthPaths = ["/api/auth/mobile/", "/api/auth/verify-2fa", "/api/auth/verify-registration"];
      const isSensitive = sensitiveAuthPaths.some(p => path.startsWith(p));
      if (capturedJsonResponse && !isSensitive) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Stripe first
  await initStripe();

  // Ensure DB indexes not covered by drizzle db:push (e.g. the partial unique index
  // that guarantees credit grants can't be double-granted on duplicate Stripe webhooks).
  try {
    await ensureCreditIndexes();
  } catch (err) {
    console.error('Failed to ensure credit indexes:', err);
  }

  await registerRoutes(httpServer, app);
  
  startEmailScheduler();

  setupEmailSyncWebSocket(httpServer);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
