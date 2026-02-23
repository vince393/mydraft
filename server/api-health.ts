import { db } from "./db";
import { apiHealthLogs } from "@shared/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export async function logApiHealth(
  provider: string,
  endpoint: string,
  statusCode: number,
  errorMessage?: string,
  severity?: "info" | "warning" | "error" | "critical"
): Promise<void> {
  try {
    if (statusCode >= 200 && statusCode < 300 && !errorMessage) {
      return;
    }

    const determinedSeverity = severity || (
      statusCode >= 500 ? "error" :
      statusCode === 429 ? "warning" :
      statusCode === 401 || statusCode === 403 ? "critical" :
      statusCode >= 400 ? "warning" : "info"
    );

    await db.insert(apiHealthLogs).values({
      provider,
      endpoint,
      statusCode,
      errorMessage: errorMessage || null,
      severity: determinedSeverity,
    });
  } catch (err) {
    console.error("[API Health] Failed to log:", err);
  }
}

export async function getRecentHealthLogs(limit = 50) {
  return db.select().from(apiHealthLogs)
    .orderBy(desc(apiHealthLogs.createdAt))
    .limit(limit);
}

export async function getUnresolvedIssues() {
  return db.select().from(apiHealthLogs)
    .where(
      and(
        eq(apiHealthLogs.resolved, false),
        gte(apiHealthLogs.createdAt, sql`NOW() - INTERVAL '7 days'`)
      )
    )
    .orderBy(desc(apiHealthLogs.createdAt));
}

export async function resolveIssue(id: number) {
  await db.update(apiHealthLogs)
    .set({ resolved: true })
    .where(eq(apiHealthLogs.id, id));
}

export async function resolveAllIssues() {
  await db.update(apiHealthLogs)
    .set({ resolved: true })
    .where(eq(apiHealthLogs.resolved, false));
}

export async function getHealthSummary() {
  const last24h = sql`NOW() - INTERVAL '24 hours'`;
  const last7d = sql`NOW() - INTERVAL '7 days'`;

  const [recentErrors] = await db.select({ count: sql<number>`count(*)` })
    .from(apiHealthLogs)
    .where(and(
      gte(apiHealthLogs.createdAt, last24h),
      eq(apiHealthLogs.severity, "error")
    ));

  const [criticalIssues] = await db.select({ count: sql<number>`count(*)` })
    .from(apiHealthLogs)
    .where(and(
      gte(apiHealthLogs.createdAt, last7d),
      eq(apiHealthLogs.severity, "critical"),
      eq(apiHealthLogs.resolved, false)
    ));

  const [googleErrors] = await db.select({ count: sql<number>`count(*)` })
    .from(apiHealthLogs)
    .where(and(
      eq(apiHealthLogs.provider, "google"),
      gte(apiHealthLogs.createdAt, last24h)
    ));

  const [microsoftErrors] = await db.select({ count: sql<number>`count(*)` })
    .from(apiHealthLogs)
    .where(and(
      eq(apiHealthLogs.provider, "microsoft"),
      gte(apiHealthLogs.createdAt, last24h)
    ));

  return {
    errorsLast24h: Number(recentErrors?.count || 0),
    unresolvedCritical: Number(criticalIssues?.count || 0),
    googleErrorsLast24h: Number(googleErrors?.count || 0),
    microsoftErrorsLast24h: Number(microsoftErrors?.count || 0),
    status: Number(criticalIssues?.count || 0) > 0 ? "critical" :
            Number(recentErrors?.count || 0) > 5 ? "warning" : "healthy",
  };
}
