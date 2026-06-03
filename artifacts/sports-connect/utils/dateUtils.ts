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
