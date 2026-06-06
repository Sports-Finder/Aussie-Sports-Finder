export const COACH_SUB_ROLES = [
  { value: "coach", label: "Coach" },
  { value: "assistant-coach", label: "Assistant Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "td", label: "Technical Director" },
] as const;

export type CoachSubRole = (typeof COACH_SUB_ROLES)[number]["value"];

export function coachSubRoleLabel(subRole?: string | null): string {
  if (!subRole) return "Coach";
  const found = COACH_SUB_ROLES.find((r) => r.value === subRole);
  return found?.label ?? "Coach";
}

export function coachSubRoleIcon(subRole?: string | null): string {
  switch (subRole) {
    case "trainer": return "timer-outline";
    case "td": return "clipboard-text-outline";
    case "coach":
    case "assistant-coach":
    default:
      return "whistle";
  }
}
