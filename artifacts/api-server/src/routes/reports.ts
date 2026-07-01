import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reportsTable, accountsTable, bannedEmailsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapReport } from "../lib/mapDbToApi";
import { getAuth } from "@clerk/express";
import crypto from "crypto";

const router: IRouter = Router();

function isAdminCaller(req: Parameters<typeof getAuth>[0]): boolean {
  const auth = getAuth(req);
  const allowlist = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return !!auth.userId && allowlist.includes(auth.userId);
}

/**
 * Derive the reporter account ID from the authenticated Clerk user.
 * Returns null if the caller is not authenticated or has no linked account.
 */
async function resolveReporterAccountId(req: Parameters<typeof getAuth>[0]): Promise<string | null> {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  if (!clerkUserId) return null;
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.clerkUserId, clerkUserId));
  if (accounts.length > 1) {
    logger.error({ clerkUserId }, "Multiple accounts found for the same Clerk user ID");
    return null;
  }
  return accounts[0]?.publicId ?? null;
}

/**
 * Create a new report.
 * Body: { targetAccountId, reason }  (reporterAccountId is derived from auth)
 */
router.post("/reports", async (req, res) => {
  try {
    const { targetAccountId, reason } = req.body as Record<string, unknown>;
    if (!targetAccountId || !reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const reporterAccountId = await resolveReporterAccountId(req);
    if (!reporterAccountId) {
      res.status(401).json({ error: "Reporter identity could not be verified." });
      return;
    }
    const publicId = crypto.randomUUID().replace(/-/g, "");
    const now = new Date();
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(reportsTable)
        .values({
          publicId,
          reporterAccountId,
          targetAccountId: targetAccountId as string,
          reason: reason as string,
        })
        .returning();
      await tx
        .update(accountsTable)
        .set({ status: "review", statusReason: reason as string, statusChangedAt: now })
        .where(eq(accountsTable.publicId, targetAccountId as string));
      return created;
    });
    // Fetch the created row outside the transaction so mapReport works on a plain object
    const [createdRow] = await db.select().from(reportsTable).where(eq(reportsTable.publicId, publicId));
    res.status(201).json(mapReport(createdRow as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to create report");
    res.status(500).json({ error: "Failed to create report" });
  }
});

/**
 * Admin-only: list all reports ordered by newest first.
 */
router.get("/reports", async (req, res) => {
  if (!isAdminCaller(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(reportsTable)
      .orderBy(desc(reportsTable.createdAt));
    res.json(rows.map((r) => mapReport(r as unknown as Record<string, unknown>)));
  } catch (err) {
    logger.error({ err }, "Failed to fetch reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/**
 * Admin-only: resolve a report and update the target account status.
 * Body: { resolution: "ok" | "underage" }
 */
router.post("/reports/:publicId/resolve", async (req, res) => {
  if (!isAdminCaller(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { resolution, resolutionNote } = req.body as { resolution?: string; resolutionNote?: string };
    if (!resolution || (resolution !== "ok" && resolution !== "underage")) {
      res.status(400).json({ error: "Invalid resolution. Must be 'ok' or 'underage'." });
      return;
    }
    const [report] = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.publicId, req.params.publicId));
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const now = new Date();
    const auth = getAuth(req);
    const defaultNote = resolution === "ok" ? "Reviewed — Account OK" : "Report confirmed — Account banned";
    const storedNote = (typeof resolutionNote === "string" && resolutionNote.trim()) ? resolutionNote.trim() : defaultNote;
    // Look up target account email before the transaction so we can ban it atomically.
    const [targetAccount] = await db
      .select({ email: accountsTable.email })
      .from(accountsTable)
      .where(eq(accountsTable.publicId, report.targetAccountId));
    await db.transaction(async (tx) => {
      await tx
        .update(reportsTable)
        .set({
          status: "resolved",
          resolvedAt: now,
          resolvedBy: auth.userId ?? undefined,
          resolution: storedNote,
        })
        .where(eq(reportsTable.publicId, req.params.publicId));
      if (resolution === "underage") {
        await tx
          .update(accountsTable)
          .set({ status: "banned", statusReason: storedNote, statusChangedAt: now })
          .where(eq(accountsTable.publicId, report.targetAccountId));
        // Also ban the email so the user cannot re-register after being banned.
        if (targetAccount?.email) {
          await tx
            .insert(bannedEmailsTable)
            .values({ email: targetAccount.email.toLowerCase().trim(), reason: storedNote })
            .onConflictDoNothing();
        }
      } else {
        await tx
          .update(accountsTable)
          .set({ status: "active", statusReason: undefined, statusChangedAt: now })
          .where(eq(accountsTable.publicId, report.targetAccountId));
      }
    });
    const [resolved] = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.publicId, req.params.publicId));
    res.json(mapReport(resolved as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to resolve report");
    res.status(500).json({ error: "Failed to resolve report" });
  }
});

export default router;
