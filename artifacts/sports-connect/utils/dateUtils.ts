/** Parse a "DD-MM-YYYY" date-of-birth string and return the age in whole years, or null if invalid. */
export function parseDobAge(dob?: string): number | null {
  if (!dob) return null;
  const parts = dob.split("-");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Auto-format raw digits into DD/MM/YYYY as the user types.
 * e.g. "01012027" -> "01/01/2027"
 */
export function formatTrialDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

/** Parse a "DD/MM/YYYY" string into a Date, or null if invalid. */
export function parseTrialDate(dateStr: string): Date | null {
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/**
 * Format a "DD/MM/YYYY" string into a human-readable day + date.
 * e.g. "01/01/2027" -> "Friday 1st January 2027"
 */
export function formatTrialDateDisplay(dateStr: string): string | null {
  const date = parseTrialDate(dateStr);
  if (!date) return null;
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd"
    : "th";
  const weekday = date.toLocaleDateString("en-AU", { weekday: "long" });
  const month = date.toLocaleDateString("en-AU", { month: "long" });
  const year = date.getFullYear();
  return `${weekday} ${day}${suffix} ${month} ${year}`;
}
