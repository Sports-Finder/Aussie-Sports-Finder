const MOBILE_RE = /(\+?61[\s.-]?)?0?4\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3}/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const URL_RE = /https?:\/\/|www\./i;

export function detectContactInfo(text: string): string | null {
  if (MOBILE_RE.test(text)) return "Phone numbers aren't allowed here — please connect privately instead.";
  if (EMAIL_RE.test(text)) return "Email addresses aren't allowed here — please connect privately instead.";
  if (URL_RE.test(text)) return "Web links aren't allowed here — please connect privately instead.";
  return null;
}
