import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/**
 * Server-side admin authorisation.
 * Checks the authenticated Clerk userId against the ADMIN_USER_IDS env var
 * (comma-separated list of Clerk user IDs that are permitted to call admin
 * routes).  Requires requireAuth to have already run so that getAuth(req)
 * returns a verified userId.
 *
 * If ADMIN_USER_IDS is not configured the middleware always rejects
 * (fail-closed).  No secret is ever sent to or expected from the client.
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  const allowlist = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowlist.length === 0) {
    req.log.warn("ADMIN_USER_IDS not configured — rejecting admin request");
    res.status(403).json({ error: "Admin not configured" });
    return;
  }
  const auth = getAuth(req);
  if (!auth.userId || !allowlist.includes(auth.userId)) {
    req.log.warn({ userId: auth.userId ?? "(null)" }, "Admin check failed");
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};
