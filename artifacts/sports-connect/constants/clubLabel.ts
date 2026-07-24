/** Returns the display label for a club-type account ("Club" or "Academy"). */
export function getClubLabel(account?: { clubType?: string } | null): string {
  return account?.clubType === "academy" ? "Academy" : "Club";
}

/**
 * Returns the article + label suitable for use inside a sentence
 * e.g. "an Academy" or "a Club".
 */
export function getClubArticle(account?: { clubType?: string } | null): string {
  return account?.clubType === "academy" ? "an Academy" : "a Club";
}
