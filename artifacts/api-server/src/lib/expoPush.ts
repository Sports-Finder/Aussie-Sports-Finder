import { logger } from "./logger";

type ExpoPushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Send one or more push notifications via the Expo Push API.
 * Safe to call with an empty token list — no-ops silently.
 * Ticket errors are logged but never thrown.
 */
export async function sendExpoPushNotifications(
  tokens: string[],
  message: Omit<ExpoPushMessage, "to">
): Promise<void> {
  if (tokens.length === 0) return;

  const payload: ExpoPushMessage = { ...message, to: tokens, priority: "high" };

  try {
    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status }, "Expo Push API returned non-200");
      return;
    }

    const json = (await resp.json()) as { data: ExpoTicket[] };
    const tickets = json.data ?? [];
    for (const ticket of tickets) {
      if (ticket.status === "error") {
        logger.warn({ ticket }, "Expo push ticket error");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to call Expo Push API");
  }
}
