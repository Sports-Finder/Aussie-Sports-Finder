import { customFetch } from "@workspace/api-client-react";

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(body.message as string ?? `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Active moderator session token for the flagged conversations endpoints.
 * Set by the context when a moderator with a valid server session is active,
 * cleared when they sign out. The token is verified server-side against the
 * moderator_sessions table (DB-backed, permission-checked, revocable).
 */
let _moderatorToken: string | null = null;

export function setModeratorToken(token: string | null): void {
  _moderatorToken = token;
}

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  return customFetch<any>(`/api${path}`, options);
}

/** Like apiFetch but includes the moderator session token when available. */
async function apiFetchWithModToken(path: string, options?: RequestInit): Promise<any> {
  const extraHeaders: Record<string, string> = {};
  if (_moderatorToken) extraHeaders["X-Moderator-Token"] = _moderatorToken;
  return customFetch<any>(`/api${path}`, {
    ...options,
    headers: { ...extraHeaders, ...((options?.headers as Record<string, string>) ?? {}) },
  });
}

export const api = {
  getAdverts: () => apiFetch("/adverts") as Promise<any[]>,
  getAccounts: () => apiFetch("/accounts") as Promise<any[]>,
  getAdminAccounts: () => apiFetch("/admin/accounts") as Promise<any[]>,
  getConversations: () => apiFetch("/conversations") as Promise<any[]>,
  getProfileImages: () => apiFetch("/profile-images") as Promise<any[]>,
  getSportRequests: () => apiFetch("/sport-requests") as Promise<any[]>,
  getBannedEmails: () => apiFetch("/banned-emails") as Promise<string[]>,

  createAdvert: (body: any) => apiFetch("/adverts", { method: "POST", body: JSON.stringify(body) }),
  updateAdvert: (publicId: string, body: any) => apiFetch(`/adverts/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAdvert: (publicId: string) => apiFetch(`/adverts/${publicId}`, { method: "DELETE" }),

  createAccount: (body: any) => apiFetch("/accounts", { method: "POST", body: JSON.stringify(body) }),
  createSportRequest: (body: any) => apiFetch("/sport-requests", { method: "POST", body: JSON.stringify(body) }),
  updateAccount: (publicId: string, body: any) => apiFetch(`/accounts/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),

  createConversation: (body: any) => apiFetch("/conversations", { method: "POST", body: JSON.stringify(body) }),
  updateConversation: (convPublicId: string, body: any) =>
    apiFetch(`/conversations/${convPublicId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteConversation: (convPublicId: string) =>
    apiFetch(`/conversations/${convPublicId}`, { method: "DELETE" }),
  createMessage: (convPublicId: string, body: any) =>
    apiFetch(`/conversations/${convPublicId}/messages`, { method: "POST", body: JSON.stringify(body) }),

  /** Flagged queue — sends X-Moderator-Token so moderator sessions are verified server-side. */
  getFlaggedConversations: () => apiFetchWithModToken("/conversations/flagged") as Promise<any[]>,
  /** Mark reviewed — sends X-Moderator-Token for the same server-side session verification. */
  markFlagReviewed: (convPublicId: string) =>
    apiFetchWithModToken(`/conversations/${convPublicId}/flag-reviewed`, { method: "POST" }),

  createProfileImage: (body: any) => apiFetch("/profile-images", { method: "POST", body: JSON.stringify(body) }),
  updateProfileImage: (publicId: string, body: any) => apiFetch(`/profile-images/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProfileImage: (publicId: string) => apiFetch(`/profile-images/${publicId}`, { method: "DELETE" }),
  updateSportRequest: (publicId: string, body: any) => apiFetch(`/sport-requests/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),

  banEmail: (email: string) => apiFetch("/banned-emails", { method: "POST", body: JSON.stringify({ email }) }),
  unbanEmail: (email: string) => apiFetch(`/banned-emails/${email}`, { method: "DELETE" }),
  wipeAll: () => apiFetch("/wipe", { method: "DELETE" }),

  createCoachAffiliate: (body: any) => apiFetch("/coach-affiliates", { method: "POST", body: JSON.stringify(body) }),
  updateCoachAffiliate: (publicId: string, body: any) => apiFetch(`/coach-affiliates/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCoachAffiliate: (publicId: string) => apiFetch(`/coach-affiliates/${publicId}`, { method: "DELETE" }),

  grantEntitlement: (accountPublicId: string, entitlementIdentifier: string) =>
    apiFetch("/admin/entitlements", { method: "POST", body: JSON.stringify({ accountPublicId, entitlementIdentifier }) }),
  revokeEntitlement: (accountPublicId: string, entitlementIdentifier: string) =>
    apiFetch("/admin/entitlements", { method: "DELETE", body: JSON.stringify({ accountPublicId, entitlementIdentifier }) }),

  /** Admin-only: create a server-side session granting moderator permissions. */
  createModeratorSession: (permissions: { closeChats: boolean }) =>
    apiFetch("/moderator-sessions", { method: "POST", body: JSON.stringify(permissions) }) as Promise<{ token: string }>,
  /** Admin-only: revoke a previously issued moderator session token. */
  revokeModeratorSession: (token: string) =>
    apiFetch(`/moderator-sessions/${token}`, { method: "DELETE" }),

  createReport: (body: any) => apiFetch("/reports", { method: "POST", body: JSON.stringify({ targetAccountId: body.targetAccountId, reason: body.reason }) }),
  getReports: () => apiFetch("/reports") as Promise<any[]>,
  resolveReport: (publicId: string, resolution: "ok" | "underage", resolutionNote?: string) =>
    apiFetch(`/reports/${publicId}/resolve`, { method: "POST", body: JSON.stringify({ resolution, resolutionNote }) }),

  /**
   * Register this device's Expo push token so the server can deliver
   * HIGH-severity flag notifications immediately (without polling).
   * Idempotent — safe to call on every admin/moderator login.
   */
  registerAdminPushToken: (token: string, label?: string) =>
    apiFetchWithModToken("/admin/push-tokens", {
      method: "POST",
      body: JSON.stringify({ token, label }),
    }),
  /** Unregister this device's push token on admin/moderator logout. */
  unregisterAdminPushToken: (token: string) =>
    apiFetchWithModToken(`/admin/push-tokens/${encodeURIComponent(token)}`, { method: "DELETE" }),
};
