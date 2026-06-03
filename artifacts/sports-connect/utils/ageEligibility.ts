import { AGE_GROUPS } from "@/constants/ageGroups";
import { parseDobAge } from "@/utils/dateUtils";

type AgeCheckAccount = { role: string; dateOfBirth?: string };
type AgeCheckAdvert = { type: string; ageGroup?: string; preferredAge?: number };

/**
 * Returns a human-readable reason string if the account's player age does not
 * match the advert's age group / preferred age, or null if eligible.
 * Only applies to players and guardians connecting to players-wanted / club-trials adverts.
 * If the account has no DOB set, the check is skipped (returns null).
 */
export function getAgeBlockReason(
  account: AgeCheckAccount | null,
  advert: AgeCheckAdvert,
): string | null {
  if (advert.type !== "players-wanted" && advert.type !== "club-trials") return null;
  if (!account || (account.role !== "player" && account.role !== "guardian")) return null;

  const age = parseDobAge(account.dateOfBirth);
  if (age === null) return null;

  const roleLabel = account.role === "guardian" ? "Your player is" : "You are";

  if (advert.ageGroup) {
    const group = AGE_GROUPS.find((g) => g.label === advert.ageGroup);
    if (group && (age < group.min || age > group.max)) {
      return `This advert is for ${advert.ageGroup}. ${roleLabel} ${age} year${age === 1 ? "" : "s"} old.`;
    }
  } else if (advert.preferredAge !== undefined) {
    if (age !== advert.preferredAge) {
      return `This advert is looking for a player aged ${advert.preferredAge}. ${roleLabel} ${age} year${age === 1 ? "" : "s"} old.`;
    }
  }

  return null;
}
