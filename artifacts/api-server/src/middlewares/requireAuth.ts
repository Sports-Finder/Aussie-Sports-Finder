import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/**
 * Requires a valid Clerk session on the request.
 * Returns 401 for unauthenticated requests.
 * Apply after clerkMiddleware in the chain.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
