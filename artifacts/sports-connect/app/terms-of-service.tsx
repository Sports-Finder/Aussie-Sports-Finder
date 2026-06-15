import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function TermsOfServiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
        <Text style={[styles.heading, { color: colors.foreground }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          By creating an account or using the Aussie Sports Club Finder app, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the app.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>2. Age Requirement</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          You must be 18 years of age or older to create an account. Parent or Guardian accounts may be created on behalf of a player under 18, but the parent or guardian must be 18 or older. Misrepresenting your age is a breach of these Terms and may result in immediate account termination and reporting to relevant authorities.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>3. User Conduct</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          You agree to use the app only for its intended purpose: connecting players, coaches, and clubs for sporting opportunities. You must not share personal contact information publicly, engage in harassment, or post false or misleading information.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>4. Account Termination</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          We reserve the right to suspend or terminate any account at our sole discretion, without prior notice, for any violation of these Terms or for any other reason we deem necessary to protect the community.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>5. Content and Moderation</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          All profile images, highlight reels, and sport requests are subject to admin approval. Inappropriate content will be rejected and may result in account suspension.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>6. Limitation of Liability</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          The app is provided as-is. We do not guarantee the accuracy of user-provided information and are not responsible for any disputes arising between users.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>7. Changes to Terms</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance of the revised Terms.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>8. Contact</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          For questions about these Terms, contact the app administrator through the app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: "700" },
  heading: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
});
