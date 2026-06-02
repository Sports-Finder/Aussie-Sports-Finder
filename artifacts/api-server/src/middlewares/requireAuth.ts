import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/**
 * Requires a valid Clerk session on the request.
 * Returns 401 for unauthenticated requests.
 * Apply after clerkMiddleware in the chain.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
  const authHeader = req.headers["authorization"];
  req.log.info({
    authHeader: authHeader ? `${authHeader.slice(0, 30)}...` : "(none)",
    userId: auth.userId ?? "(null)",
    sessionId: auth.sessionId ?? "(null)",
  }, "requireAuth check");
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
