import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ImageSourcePropType, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function ScreenShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <View style={[styles.shell, { backgroundColor: colors.background }]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionHeading, { color: colors.foreground }]}>{title}</Text>
      {action ? <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text> : null}
    </View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, { backgroundColor: active ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[styles.pillText, { color: active ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ label, icon, onPress, disabled }: { label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, { backgroundColor: disabled ? colors.mutedForeground : colors.primary, opacity: pressed ? 0.82 : 1 }]}>
      {icon ? <Feather name={icon} color={colors.primaryForeground} size={18} /> : null}
      <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; label: string }) {
  const colors = useColors();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
      <Feather name={icon} color={colors.foreground} size={20} />
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        {...props}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }, props.multiline ? styles.multiline : null, props.style]}
      />
    </View>
  );
}

export function ProfileAvatar({ uri, fallback, size = 64 }: { uri?: string; fallback: ImageSourcePropType; size?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.pitchSoft, borderColor: colors.border }]}>
      <Image source={uri ? { uri } : fallback} style={{ width: "100%", height: "100%" }} contentFit="cover" />
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: keyof typeof Feather.glyphMap; title: string; text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={28} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionHeading: { fontWeight: "700", fontSize: 20 },
  sectionAction: { fontWeight: "600", fontSize: 13 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginRight: 8 },
  pillText: { fontWeight: "700", fontSize: 13 },
  button: { minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 18 },
  buttonText: { fontWeight: "700", fontSize: 15 },
  iconButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  fieldWrap: { gap: 7, marginBottom: 12 },
  fieldLabel: { fontWeight: "600", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, minHeight: 48, fontWeight: "500", fontSize: 15 },
  multiline: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
  avatar: { overflow: "hidden", borderWidth: 1 },
  empty: { borderWidth: 1, borderRadius: 24, padding: 24, alignItems: "center", gap: 8 },
  emptyTitle: { fontWeight: "700", fontSize: 17, marginTop: 4 },
  emptyText: { fontWeight: "400", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
