import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

/**
 * Middleware that authenticates admin passcode requests.
 *
 * Reads the `X-Admin-Passcode` request header and compares it
 * (constant-time, to prevent timing attacks) against the `ADMIN_PASSCODE`
 * environment variable.
 *
 * - 401 if the header is absent or the env var is not configured.
 * - 403 if the header is present but the passcode is wrong.
 * - Falls through to next() on success.
 *
 * This middleware is designed for routes that sit OUTSIDE the global
 * requireAuth fence so that the admin panel (passcode-only, no Clerk session)
 * can reach them.
 */
export const requireAdminPasscode: RequestHandler = (req, res, next) => {
  const configured = process.env.ADMIN_PASSCODE;
  if (!configured) {
    req.log.warn("ADMIN_PASSCODE not configured — rejecting request");
    res.status(401).json({ error: "Admin passcode not configured" });
    return;
  }

  const provided = req.headers["x-admin-passcode"];
  if (typeof provided !== "string" || !provided) {
    res.status(401).json({ error: "X-Admin-Passcode header required" });
    return;
  }

  // constant-time comparison so response time doesn't leak prefix length
  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  // buffers must be same length for timingSafeEqual; pad both to max length
  const len = Math.max(a.length, b.length);
  const ab = Buffer.concat([a, Buffer.alloc(len - a.length)]);
  const bb = Buffer.concat([b, Buffer.alloc(len - b.length)]);
  const match = timingSafeEqual(ab, bb) && a.length === b.length;

  if (!match) {
    req.log.warn("Admin passcode mismatch");
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
};
