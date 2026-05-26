/**
 * Converts ISO date strings to Date objects for Drizzle timestamp columns.
 * Call this on req.body before passing to .set() or .values().
 */
export function normalizeDates<T extends Record<string, unknown>>(
  body: T,
  dateKeys: string[],
): T {
  const result = { ...body } as Record<string, unknown>;
  for (const key of dateKeys) {
    const value = result[key];
    if (typeof value === "string") {
      result[key] = new Date(value);
    }
  }
  return result as T;
}
