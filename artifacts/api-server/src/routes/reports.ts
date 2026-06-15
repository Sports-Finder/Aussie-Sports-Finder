import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reportsTable, accountsTable } from "@workspace/db";
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
 * Create a new report.
 * Body: { reporterAccountId, targetAccountId, reason }
 *
 * NOTE: reporterAccountId is accepted from the client because the server
 * currently has no mapping between Clerk userId and local account id.
 * The accounts table stores socialId (Apple/Google provider ID) and email,
 * but not a Clerk userId column. To derive the reporter server-side, add
 * a clerkUserId column to accountsTable and join on getAuth(req).userId.
 */
router.post("/reports", async (req, res) => {
  try {
    const { reporterAccountId, targetAccountId, reason } = req.body as Record<string, unknown>;
    if (!reporterAccountId || !targetAccountId || !reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const publicId = crypto.randomUUID().replace(/-/g, "");
    const now = new Date();
    const [created] = await db
      .insert(reportsTable)
      .values({
        publicId,
        reporterAccountId: reporterAccountId as string,
        targetAccountId: targetAccountId as string,
        reason: reason as string,
      })
      .returning();
    // Atomically set the target account status to "review" so the account is
    // paused immediately regardless of whether the client update succeeds.
    await db
      .update(accountsTable)
      .set({ status: "review", statusReason: reason as string, statusChangedAt: now })
      .where(eq(accountsTable.publicId, targetAccountId as string));
    res.status(201).json(mapReport(created as unknown as Record<string, unknown>));
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
    const { resolution } = req.body as { resolution?: string };
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
    const [resolved] = await db
      .update(reportsTable)
      .set({
        status: "resolved",
        resolvedAt: now,
        resolution: resolution === "ok" ? "Reviewed — Account OK" : "Underage confirmed — Account closed",
      })
      .where(eq(reportsTable.publicId, req.params.publicId))
      .returning();
    // Update target account status
    if (resolution === "underage") {
      await db
        .update(accountsTable)
        .set({ status: "banned", statusReason: "Underage confirmed via report", statusChangedAt: now })
        .where(eq(accountsTable.publicId, report.targetAccountId));
    } else {
      // Set back to active
      await db
        .update(accountsTable)
        .set({ status: "active", statusReason: undefined, statusChangedAt: now })
        .where(eq(accountsTable.publicId, report.targetAccountId));
    }
    res.json(mapReport(resolved as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to resolve report");
    res.status(500).json({ error: "Failed to resolve report" });
  }
});

export default router;
