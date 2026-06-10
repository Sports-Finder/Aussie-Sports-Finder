import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, accountsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAccountAdmin } from "../lib/mapDbToApi";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

async function callRevenueCatEntitlement(
  method: "POST" | "DELETE",
  appUserId: string,
  entitlementIdentifier: string,
): Promise<void> {
  const connectors = new ReplitConnectors();
  const path = `/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(entitlementIdentifier)}/promotional`;
  const response = await connectors.proxy("revenuecat", path, { method });
  // For DELETE (revoke), treat 404 as success — entitlement already absent.
  // For POST (grant), any non-2xx is a real failure.
  if (!response.ok && !(method === "DELETE" && response.status === 404)) {
    const errText = await response.text();
    throw new Error(`RevenueCat ${method} failed (${response.status}): ${errText}`);
  }
}

router.post("/admin/entitlements", requireAdmin, async (req, res) => {
  try {
    const { accountPublicId, entitlementIdentifier } = req.body as {
      accountPublicId?: string;
      entitlementIdentifier?: string;
    };
    if (!accountPublicId || !entitlementIdentifier) {
      res.status(400).json({ error: "accountPublicId and entitlementIdentifier are required" });
      return;
    }

    await callRevenueCatEntitlement("POST", accountPublicId, entitlementIdentifier);

    const [updated] = await db
      .update(accountsTable)
      .set({ promotionalPremium: true, updatedAt: new Date() })
      .where(eq(accountsTable.publicId, accountPublicId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json(mapAccountAdmin(updated as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to grant entitlement");
    res.status(502).json({ error: "Failed to grant entitlement via RevenueCat" });
  }
});

router.delete("/admin/entitlements", requireAdmin, async (req, res) => {
  try {
    const { accountPublicId, entitlementIdentifier } = req.body as {
      accountPublicId?: string;
      entitlementIdentifier?: string;
    };
    if (!accountPublicId || !entitlementIdentifier) {
      res.status(400).json({ error: "accountPublicId and entitlementIdentifier are required" });
      return;
    }

    await callRevenueCatEntitlement("DELETE", accountPublicId, entitlementIdentifier);

    const [updated] = await db
      .update(accountsTable)
      .set({ promotionalPremium: false, updatedAt: new Date() })
      .where(eq(accountsTable.publicId, accountPublicId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json(mapAccountAdmin(updated as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to revoke entitlement");
    res.status(502).json({ error: "Failed to revoke entitlement via RevenueCat" });
  }
});

export default router;
