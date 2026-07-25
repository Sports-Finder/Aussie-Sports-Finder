import leoProfanity from "leo-profanity";

// Initialise with all built-in dictionaries (english covers Australian English well enough)
leoProfanity.loadDictionary("en");

/**
 * Returns true if the text contains profanity.
 */
export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) return false;
  return leoProfanity.check(text);
}

/**
 * Check a list of labelled fields.
 * Returns the label of the first field that contains profanity, or null if all clear.
 *
 * @example
 * const bad = checkFields([{ label: "Bio", value: bio }, { label: "Title", value: title }]);
 * if (bad) Alert.alert("Inappropriate language", `Please remove inappropriate language from the ${bad} field.`);
 */
export function checkFields(fields: { label: string; value: string | undefined | null }[]): string | null {
  for (const { label, value } of fields) {
    if (value && containsProfanity(value)) {
      return label;
    }
  }
  return null;
}
