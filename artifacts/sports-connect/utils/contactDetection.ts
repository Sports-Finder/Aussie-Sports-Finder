const MOBILE_RE = /(\+?61[\s.-]?)?0?4\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3}/;
const MOBILE_COLLAPSED_RE = /(\+?61)?0?4\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const URL_RE = /https?:\/\/|www\./i;

const SUFFIX = " Any attempt to share personal contact details in a different format will result in your account being closed and banned. Don't risk it!";

function collapseText(text: string): string {
  return text.replace(/[\s.\-()]/g, "");
}

export function detectContactInfo(text: string): string | null {
  if (MOBILE_RE.test(text) || MOBILE_COLLAPSED_RE.test(collapseText(text)))
    return `Phone numbers aren't allowed here — please connect privately instead.${SUFFIX}`;
  if (EMAIL_RE.test(text)) return `Email addresses aren't allowed here — please connect privately instead.${SUFFIX}`;
  if (URL_RE.test(text)) return `Web links aren't allowed here — please connect privately instead.${SUFFIX}`;
  return null;
}
