export const COACH_SUB_ROLES = [
  { value: "head-coach", label: "Head Coach" },
  { value: "assistant-coach", label: "Assistant Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "technical-director", label: "Technical Director (TD)" },
  { value: "other", label: "Other" },
] as const;

export type CoachSubRole = (typeof COACH_SUB_ROLES)[number]["value"];
