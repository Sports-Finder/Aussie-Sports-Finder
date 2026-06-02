import { ReplitConnectors } from "@replit/connectors-sdk";

type ApiResult<T> = { data: T; error: null } | { data: undefined; error: unknown };

async function makeRequest<T>(
  method: string,
  resolvedUrl: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const connectors = new ReplitConnectors();
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const response = await connectors.proxy("revenuecat", `/v2${resolvedUrl}`, opts);
  if (!response.ok) {
    const errText = await response.text();
    let errData: unknown;
    try { errData = JSON.parse(errText); } catch { errData = { message: errText }; }
    return { data: undefined, error: errData };
  }
  const text = await response.text();
  if (!text) return { data: undefined as unknown as T, error: null };
  return { data: JSON.parse(text) as T, error: null };
}

function resolveUrl(url: string, path?: Record<string, string>, query?: Record<string, string | number>): string {
  let resolved = url;
  if (path) {
    for (const [k, v] of Object.entries(path)) {
      resolved = resolved.replace(`{${k}}`, encodeURIComponent(v));
    }
  }
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) params.set(k, String(v));
    resolved += `?${params.toString()}`;
  }
  return resolved;
}

export async function getUncachableRevenueCatClient() {
  return {
    post: <T>({ url, path, body }: { url: string; path?: Record<string, string>; body?: unknown }) =>
      makeRequest<T>("POST", resolveUrl(url, path), body),
    get: <T>({ url, path, query }: { url: string; path?: Record<string, string>; query?: Record<string, string | number> }) =>
      makeRequest<T>("GET", resolveUrl(url, path, query)),
    patch: <T>({ url, path, body }: { url: string; path?: Record<string, string>; body?: unknown }) =>
      makeRequest<T>("PATCH", resolveUrl(url, path), body),
    delete: <T>({ url, path }: { url: string; path?: Record<string, string> }) =>
      makeRequest<T>("DELETE", resolveUrl(url, path)),
  };
}
