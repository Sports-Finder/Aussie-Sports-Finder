import { Image } from "expo-image";
import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminPage, ModeratorPage } from "@/components/AdminDashboard";
import { PrimaryButton } from "@/components/SportsUI";
import { useAuth } from "@/lib/auth";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

const logo = require("@/assets/images/icon.png") as number;

export function OnboardingGate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAdmin, isModerator, adminLogin, adminSignOut, moderatorLogin, moderatorSignOut } = useSportsConnect();
  const { login, isLoading: authLoading } = useAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");

  if (isAdmin) return <AdminPage onExit={() => adminSignOut()} />;
  if (isModerator) return <ModeratorPage onExit={() => moderatorSignOut()} />;

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 34 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>Aussie Sports Club Finder</Text>
          <Text style={[styles.brandText, { color: colors.mutedForeground }]}>
            Welcome to the ultimate Player, Coach & Club Portal for Aussie Sports Nationwide, both community & competitive for all age groups. Sign in to get started and make a connection today!
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Get started</Text>
          <PrimaryButton label="Log in" icon="log-in" onPress={login} disabled={authLoading} />
          <Pressable onPress={() => { setAdminPasscodeInput(""); setShowAdminModal(true); }} style={styles.adminLink}>
            <Text style={[styles.adminLinkText, { color: colors.mutedForeground }]}>Admin access</Text>
          </Pressable>
        </View>

        <Modal transparent visible={showAdminModal} animationType="fade" onRequestClose={() => setShowAdminModal(false)}>
          <View style={styles.modalScrim}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Admin login</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Enter your admin passcode to access moderation tools.</Text>
              <TextInput
                value={adminPasscodeInput}
                onChangeText={setAdminPasscodeInput}
                placeholder="Admin passcode"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setShowAdminModal(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const adminOk = adminLogin(adminPasscodeInput);
                    if (adminOk) { setShowAdminModal(false); return; }
                    const modOk = moderatorLogin(adminPasscodeInput);
                    if (modOk) { setShowAdminModal(false); return; }
                    Alert.alert("Incorrect passcode", "The passcode you entered is incorrect. Please try again.");
                  }}
                  style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Login</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  brand: { alignItems: "center", gap: 10 },
  logo: { width: 236, height: 236, borderRadius: 56 },
  brandTitle: { fontWeight: "800", fontSize: 28, textAlign: "center", letterSpacing: -0.7 },
  brandText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  card: { borderWidth: 1, borderRadius: 30, padding: 18, gap: 14 },
  cardTitle: { fontWeight: "800", fontSize: 23, letterSpacing: -0.4 },
  smallPrint: { fontWeight: "500", fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 16, minHeight: 48, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderWidth: 1, borderRadius: 28, padding: 22, gap: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
  adminLink: { alignItems: "center", paddingVertical: 4 },
  adminLinkText: { fontWeight: "600", fontSize: 12, textDecorationLine: "underline" },
});
