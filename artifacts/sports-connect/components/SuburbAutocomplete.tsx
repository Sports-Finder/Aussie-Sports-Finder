import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const SUBURBS: [string, string, string][] = require("@/assets/data/australianSuburbs.json") as [string, string, string][];

export type SuburbSelection = { suburb: string; postcode: string; state: string };

function searchSuburbs(query: string): [string, string, string][] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const starts: [string, string, string][] = [];
  const contains: [string, string, string][] = [];
  for (const entry of SUBURBS) {
    const lower = entry[0].toLowerCase();
    if (lower.startsWith(q)) {
      starts.push(entry);
    } else if (lower.includes(q)) {
      contains.push(entry);
    }
    if (starts.length >= 10) break;
  }
  return [...starts, ...contains].slice(0, 10);
}

export function SuburbAutocomplete({
  label,
  required,
  value,
  onSelect,
  placeholder,
  editable = true,
}: {
  label: string;
  required?: boolean;
  value: string;
  onSelect: (sel: SuburbSelection) => void;
  placeholder?: string;
  editable?: boolean;
}) {
  const colors = useColors();

  const [text, setText] = useState(value);
  const [suggestions, setSuggestions] = useState<[string, string, string][]>([]);

  const confirmedRef = useRef(value.length > 0);
  const textRef = useRef(value);

  useEffect(() => {
    textRef.current = value;
    confirmedRef.current = value.length > 0;
    setText(value);
    setSuggestions([]);
  }, [value]);

  const handleChange = useCallback((v: string) => {
    textRef.current = v;
    confirmedRef.current = false;
    setText(v);
    setSuggestions(v.length >= 2 ? searchSuburbs(v) : []);
  }, []);

  const handleSelect = useCallback(
    (entry: [string, string, string]) => {
      textRef.current = entry[0];
      confirmedRef.current = true;
      setText(entry[0]);
      setSuggestions([]);
      onSelect({ suburb: entry[0], postcode: entry[1], state: entry[2] });
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    textRef.current = "";
    confirmedRef.current = false;
    setText("");
    setSuggestions([]);
    onSelect({ suburb: "", postcode: "", state: "" });
  }, [onSelect]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setSuggestions([]);
      if (textRef.current.length > 0 && !confirmedRef.current) {
        textRef.current = "";
        setText("");
        onSelect({ suburb: "", postcode: "", state: "" });
      }
    }, 200);
  }, [onSelect]);

  const showDropdown = suggestions.length > 0;
  const isUnconfirmed = text.length > 0 && !confirmedRef.current;

  return (
    <View style={acStyles.wrap}>
      {label ? (
        <Text style={[acStyles.label, { color: colors.mutedForeground }]}>
          {label}
          {required ? <Text style={{ color: "#D9534F" }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          acStyles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: isUnconfirmed ? "#D9534F" : colors.foreground,
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={editable ? handleChange : undefined}
          onBlur={editable ? handleBlur : undefined}
          editable={editable}
          placeholder={placeholder ?? "Start typing a suburb…"}
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="words"
          style={[acStyles.textInput, { color: colors.foreground, opacity: editable ? 1 : 0.5 }]}
        />
        {text.length > 0 && editable ? (
          <Pressable onPress={handleClear} hitSlop={8} style={acStyles.clearBtn}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {isUnconfirmed ? (
        <Text style={acStyles.errorText}>Select a suburb from the list below</Text>
      ) : null}
      {showDropdown ? (
        <View style={[acStyles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {suggestions.map((entry, idx) => (
            <Pressable
              key={`${entry[0]}-${entry[1]}-${idx}`}
              onPress={() => handleSelect(entry)}
              style={({ pressed }) => [
                acStyles.item,
                idx < suggestions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                { backgroundColor: pressed ? colors.secondary : colors.card },
              ]}
            >
              <Text style={[acStyles.itemName, { color: colors.foreground }]}>{entry[0]}</Text>
              <Text style={[acStyles.itemMeta, { color: colors.mutedForeground }]}>
                {entry[2]} {entry[1]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const acStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: "600", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 7 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 2, minHeight: 48, paddingLeft: 14, paddingRight: 6 },
  textInput: { flex: 1, fontWeight: "500", fontSize: 15, minHeight: 48 },
  clearBtn: { padding: 8 },
  errorText: { fontSize: 12, color: "#D9534F", marginTop: 3 },
  dropdown: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: "hidden" },
  item: { paddingHorizontal: 14, paddingVertical: 11 },
  itemName: { fontWeight: "600", fontSize: 14 },
  itemMeta: { fontSize: 12, marginTop: 1 },
});
