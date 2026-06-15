export type AgeGroup = { label: string; min: number; max: number };

export const AGE_GROUPS: AgeGroup[] = [
  { label: "Tiny Tots / Minis (Ages 3–6)", min: 3, max: 6 },
  { label: "Junior (Ages 7–11)", min: 7, max: 11 },
  { label: "Intermediate / Youth (Ages 12–15)", min: 12, max: 15 },
  { label: "Senior Youth (Ages 16–20)", min: 16, max: 20 },
  { label: "Senior (Ages 21+)", min: 21, max: 50 },
  { label: "Masters (Ages 35+)", min: 35, max: 100 },
];

export function getFriendlyOpponentOptions(ageGroupLabel: string): string[] {
  const group = AGE_GROUPS.find((g) => g.label === ageGroupLabel);
  if (!group) return [];
  // Senior (21+) and Masters (35+) — show open-age options
  if (group.min >= 21) {
    return ["Open Age", "Over 35s", "Over 45s"];
  }
  // Masters (35+) is already covered above (min >= 21), but for clarity:
  if (group.min >= 35) {
    return ["Over 35s", "Over 45s", "Open Age"];
  }
  // For all youth brackets, generate under-year labels within the bracket
  // plus one bracket either side (capped at U4 minimum and U21 maximum).
  const underMin = Math.max(4, group.min - 1);
  const underMax = Math.min(21, group.max + 1);
  return Array.from({ length: underMax - underMin + 1 }, (_, i) => `Under ${underMin + i}s`);
}
