import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db, accountsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

const ADMIN_EMAIL = "aussiesportsclubfinder@gmail.com";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const TOPICS = [
  "Reporting a bug or issue with the app",
  "Reporting Abuse or Misuse on the app",
  "Suggesting a Feature Request for the app",
  "Other app enquiry",
];

function createTransporter() {
  const user = process.env.CONTACT_EMAIL_USER;
  const pass = process.env.CONTACT_EMAIL_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

router.get("/contact/status", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [account] = await db
    .select({
      contactUsDisabled: accountsTable.contactUsDisabled,
      contactLastSentAt: accountsTable.contactLastSentAt,
    })
    .from(accountsTable)
    .where(eq(accountsTable.clerkUserId, auth.userId))
    .limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  let cooldownUntil: string | null = null;
  if (account.contactLastSentAt) {
    const elapsed = Date.now() - new Date(account.contactLastSentAt).getTime();
    if (elapsed < COOLDOWN_MS) {
      cooldownUntil = new Date(new Date(account.contactLastSentAt).getTime() + COOLDOWN_MS).toISOString();
    }
  }

  res.json({ contactUsDisabled: account.contactUsDisabled ?? false, cooldownUntil });
});

router.post("/contact", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { topic, message } = req.body as { topic?: string; message?: string };

  if (!topic || !TOPICS.includes(topic)) {
    res.status(400).json({ error: "Invalid topic" });
    return;
  }
  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 50) {
    res.status(400).json({ error: "Message exceeds 50 words" });
    return;
  }

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.clerkUserId, auth.userId))
    .limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (account.contactUsDisabled) {
    res.status(403).json({ error: "Contact Us has been disabled for your account" });
    return;
  }

  if (account.contactLastSentAt) {
    const elapsed = Date.now() - new Date(account.contactLastSentAt).getTime();
    if (elapsed < COOLDOWN_MS) {
      const cooldownUntil = new Date(new Date(account.contactLastSentAt).getTime() + COOLDOWN_MS).toISOString();
      res.status(429).json({ error: "Rate limited — one message per 24 hours", cooldownUntil });
      return;
    }
  }

  const senderName =
    account.clubName ||
    account.fullName ||
    account.parentGuardianName ||
    account.email;

  const transporter = createTransporter();
  if (!transporter) {
    logger.error("CONTACT_EMAIL_USER or CONTACT_EMAIL_PASS not configured — cannot send contact email");
    res.status(500).json({ error: "Email delivery not configured on this server" });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Sports Connect App" <${process.env.CONTACT_EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `[Contact Us] ${topic}`,
      text: [
        `From: ${senderName} <${account.email}>`,
        `Account ID: ${account.publicId}`,
        `Role: ${account.role}`,
        `Topic: ${topic}`,
        ``,
        `Message:`,
        message.trim(),
      ].join("\n"),
      html: [
        `<p><strong>From:</strong> ${senderName} &lt;${account.email}&gt;</p>`,
        `<p><strong>Account ID:</strong> ${account.publicId}</p>`,
        `<p><strong>Role:</strong> ${account.role}</p>`,
        `<p><strong>Topic:</strong> ${topic}</p>`,
        `<hr/>`,
        `<p><strong>Message:</strong></p>`,
        `<p>${message.trim().replace(/\n/g, "<br/>")}</p>`,
      ].join(""),
    });
  } catch (err) {
    logger.error({ err }, "Failed to send contact email");
    res.status(500).json({ error: "Failed to send email — please try again later" });
    return;
  }

  const now = new Date();
  await db
    .update(accountsTable)
    .set({ contactLastSentAt: now, updatedAt: now })
    .where(eq(accountsTable.clerkUserId, auth.userId));

  const cooldownUntil = new Date(now.getTime() + COOLDOWN_MS).toISOString();
  res.json({ ok: true, cooldownUntil });
});

router.patch("/admin/accounts/:accountPublicId/contact-us", requireAdmin, async (req, res) => {
  const accountPublicId = req.params["accountPublicId"] as string;
  const { disabled } = req.body as { disabled?: boolean };

  if (typeof disabled !== "boolean") {
    res.status(400).json({ error: "disabled (boolean) is required" });
    return;
  }

  const [updated] = await db
    .update(accountsTable)
    .set({ contactUsDisabled: disabled, updatedAt: new Date() })
    .where(eq(accountsTable.publicId, accountPublicId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json({ ok: true });
});

export default router;
