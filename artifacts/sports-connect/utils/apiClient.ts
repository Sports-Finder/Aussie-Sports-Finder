const API_BASE = typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  getAdverts: () => apiFetch("/adverts") as Promise<any[]>,
  getAccounts: () => apiFetch("/accounts") as Promise<any[]>,
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
  createMessage: (convPublicId: string, body: any) =>
    apiFetch(`/conversations/${convPublicId}/messages`, { method: "POST", body: JSON.stringify(body) }),

  createProfileImage: (body: any) => apiFetch("/profile-images", { method: "POST", body: JSON.stringify(body) }),
  updateProfileImage: (publicId: string, body: any) => apiFetch(`/profile-images/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),
  updateSportRequest: (publicId: string, body: any) => apiFetch(`/sport-requests/${publicId}`, { method: "PUT", body: JSON.stringify(body) }),

  banEmail: (email: string) => apiFetch("/banned-emails", { method: "POST", body: JSON.stringify({ email }) }),
  unbanEmail: (email: string) => apiFetch(`/banned-emails/${email}`, { method: "DELETE" }),
  wipeAll: () => apiFetch("/wipe", { method: "DELETE" }),
};
