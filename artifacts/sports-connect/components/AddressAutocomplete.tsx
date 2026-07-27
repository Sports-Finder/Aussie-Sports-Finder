import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/useColors";

// ── Nominatim types ───────────────────────────────────────────────────────────

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  city_district?: string;
  town?: string;
  city?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  address: NominatimAddress;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrimary(r: NominatimResult): string {
  const { house_number, road } = r.address;
  const street = [house_number, road].filter(Boolean).join(" ").trim();
  return street || r.display_name.split(",")[0].trim();
}

function formatSecondary(r: NominatimResult): string {
  const { suburb, city_district, town, city, municipality, state } = r.address;
  const area = suburb ?? city_district ?? town ?? city ?? municipality ?? "";
  return [area, state].filter(Boolean).join(", ");
}

/** Returns the street-address string to put into the form field when a result is selected. */
function toAddressString(r: NominatimResult): string {
  return formatPrimary(r);
}

/** Extracts suburb, postcode, and state from a Nominatim result for auto-fill. */
function extractMeta(r: NominatimResult): { suburb: string; postcode: string; state: string } {
  const { suburb, city_district, town, city, municipality, postcode, state } = r.address;
  return {
    suburb: suburb ?? city_district ?? town ?? city ?? municipality ?? "",
    postcode: postcode ?? "",
    state: state ?? "",
  };
}

async function queryNominatim(query: string): Promise<NominatimResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}` +
    `&countrycodes=au&format=json&addressdetails=1&limit=8`;
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      // Nominatim policy: identify your app in User-Agent
      "User-Agent": "SportsConnectApp/1.0 (contact@sportsconnect.com.au)",
    },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return (await res.json()) as NominatimResult[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddressAutocomplete({
  label,
  required,
  value,
  onChangeText,
  onSelect,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  /** Called on every keystroke so parent state stays in sync even without a suggestion pick. */
  onChangeText: (text: string) => void;
  /**
   * Called when the user taps a suggestion or clears the field.
   * `address` is the formatted street string (empty string on clear).
   * `meta` contains suburb, postcode, and state extracted from the Nominatim result
   * — all empty strings on clear — so callers can auto-fill dependent fields.
   */
  onSelect: (address: string, meta: { suburb: string; postcode: string; state: string }) => void;
  placeholder?: string;
}) {
  const colors = useColors();

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);

  // debounce timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // abort controller for in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // Fire Nominatim search after 400 ms of no typing
  const scheduleSearch = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const results = await queryNominatim(query);
        setSuggestions(results);
      } catch {
        // Network error or abort — degrade gracefully, keep free-text entry working
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      onChangeText(text);
      scheduleSearch(text);
    },
    [onChangeText, scheduleSearch],
  );

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      const addr = toAddressString(result);
      onChangeText(addr);
      onSelect(addr, extractMeta(result));
      setSuggestions([]);
      setLoading(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [onChangeText, onSelect],
  );

  const handleClear = useCallback(() => {
    onChangeText("");
    onSelect("", { suburb: "", postcode: "", state: "" });
    setSuggestions([]);
    setLoading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [onChangeText, onSelect]);

  const showDropdown = suggestions.length > 0;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
          {required ? <Text style={{ color: "#D9534F" }}> *</Text> : null}
        </Text>
      ) : null}

      <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder ?? "Start typing an address…"}
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="words"
          style={[styles.textInput, { color: colors.foreground }]}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} style={styles.endIcon} />
        ) : value.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8} style={styles.endIcon}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <Feather name="search" size={16} color={colors.mutedForeground} style={styles.endIcon} />
        )}
      </View>

      {showDropdown ? (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {suggestions.map((result, idx) => {
            const primary = formatPrimary(result);
            const secondary = formatSecondary(result);
            return (
              <Pressable
                key={result.place_id}
                onPress={() => handleSelect(result)}
                style={({ pressed }) => [
                  styles.item,
                  idx < suggestions.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                  { backgroundColor: pressed ? colors.secondary : colors.card },
                ]}
              >
                <Text style={[styles.itemPrimary, { color: colors.foreground }]} numberOfLines={1}>
                  {primary}
                </Text>
                {secondary ? (
                  <Text style={[styles.itemSecondary, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {secondary}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontWeight: "600",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 6,
  },
  textInput: {
    flex: 1,
    fontWeight: "500",
    fontSize: 15,
    minHeight: 48,
  },
  endIcon: {
    padding: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  itemPrimary: {
    fontWeight: "600",
    fontSize: 14,
  },
  itemSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
});
