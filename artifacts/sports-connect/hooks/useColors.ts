import { useColorScheme } from "react-native";

import { allSportsFilterName, getSportTheme } from "@/constants/sports";
import colors from "@/constants/colors";
import { useOptionalSportsConnect } from "@/context/SportsConnectContext";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const scheme = useColorScheme();
  const sportsContext = useOptionalSportsConnect();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;

  if (!sportsContext || sportsContext.selectedSport === allSportsFilterName) {
    return { ...palette, radius: colors.radius };
  }

  const sportTheme = getSportTheme(sportsContext.selectedSport, sportsContext.approvedSports);

  return {
    ...palette,
    background: sportTheme.background,
    card: "#FFFFFF",
    primary: sportTheme.button,
    secondary: sportTheme.soft,
    secondaryForeground: sportTheme.text,
    border: sportTheme.soft,
    input: sportTheme.soft,
    pitchSoft: sportTheme.soft,
    accent: sportTheme.soft,
    accentForeground: sportTheme.text,
    tint: sportTheme.button,
    radius: colors.radius,
  };
}
