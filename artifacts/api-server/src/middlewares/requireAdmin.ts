import type { RequestHandler } from "express";

/**
 * Lightweight admin-key middleware for admin-only routes.
 * Requires an `X-Admin-Key` header matching the ADMIN_API_KEY env var.
 * If ADMIN_API_KEY is not configured the middleware always rejects (fail-closed).
 * Set ADMIN_API_KEY on the server and EXPO_PUBLIC_ADMIN_API_KEY in the Expo
 * app to the same value to enable admin endpoints.
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    req.log.warn("ADMIN_API_KEY not configured — rejecting admin request");
    res.status(403).json({ error: "Admin API not configured" });
    return;
  }
  const provided = req.headers["x-admin-key"];
  if (!provided || provided !== configuredKey) {
    req.log.warn("Invalid or missing X-Admin-Key header");
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};
