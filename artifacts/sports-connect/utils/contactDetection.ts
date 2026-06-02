const MOBILE_RE = /(\+?61[\s.-]?)?0?4\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3}/;
const MOBILE_COLLAPSED_RE = /(\+?61)?0?4\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const URL_RE = /https?:\/\/|www\./i;
// Compound TLDs listed before their shorter prefixes so the engine doesn't short-circuit
const NORM_EMAIL_RE = /[\w._%+\-]+@[\w.\-]+\.(?:com\.au|net\.au|org\.au|id\.au|edu\.au|gov\.au|com|net|org|edu|gov)\b/i;
const NORM_DOMAIN_RE = /\b\w[\w\-]*\.(?:com\.au|net\.au|org\.au|id\.au|edu\.au|gov\.au|com|net|org|edu|gov)\b/i;

const SUFFIX = " Any attempt to share personal contact details in a different format will result in your account being closed and banned. Don't risk it!";

function collapseText(text: string): string {
  return text.replace(/[\s.\-()]/g, "");
}

function normalizeObfuscated(text: string): string {
  return text
    .replace(/\s*\[at\]\s*|\s*\(at\)\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*\[dot\]\s*|\s*\(dot\)\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".");
}

export function detectContactInfo(text: string): string | null {
  if (MOBILE_RE.test(text) || MOBILE_COLLAPSED_RE.test(collapseText(text)))
    return `Phone numbers aren't allowed here — please connect privately instead.${SUFFIX}`;
  const norm = normalizeObfuscated(text);
  if (EMAIL_RE.test(text) || NORM_EMAIL_RE.test(norm))
    return `Email addresses aren't allowed here — please connect privately instead.${SUFFIX}`;
  if (URL_RE.test(text) || NORM_DOMAIN_RE.test(norm))
    return `Web links aren't allowed here — please connect privately instead.${SUFFIX}`;
  return null;
}
