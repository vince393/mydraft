import Stripe from 'stripe';

let connectionSettings: any;

async function fetchConnectionForEnvironment(hostname: string, xReplitToken: string, environment: string) {
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', environment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const settings = data.items?.[0];

  if (settings?.settings?.publishable && settings?.settings?.secret) {
    return {
      publishableKey: settings.settings.publishable,
      secretKey: settings.settings.secret,
    };
  }
  return null;
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  
  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not found. Stripe integration requires the Replit connector to be set up.');
  }
  
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const primaryEnv = isProduction ? 'production' : 'development';

  let credentials = await fetchConnectionForEnvironment(hostname, xReplitToken, primaryEnv);

  if (!credentials && isProduction) {
    console.log('Stripe production keys not found, falling back to development keys');
    credentials = await fetchConnectionForEnvironment(hostname, xReplitToken, 'development');
  }

  if (!credentials) {
    throw new Error(`Stripe connection not found for ${primaryEnv}${isProduction ? ' or development' : ''}`);
  }

  return credentials;
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
