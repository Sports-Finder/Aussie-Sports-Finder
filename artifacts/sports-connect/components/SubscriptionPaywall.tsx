import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSubscription } from "@/lib/revenuecat";
import { useColors } from "@/hooks/useColors";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { getClubLabel } from "@/constants/clubLabel";
import type { PurchasesPackage } from "react-native-purchases";

type AccountTier = "club" | "player";

const CLUB_FEATURES = [
  "Unlimited adverts (14-day expiry)",
  "Unlimited connections",
  "BUMP adverts to the top of the list",
  "Coach affiliate system",
  "Gold star verified badge",
];

const PLAYER_FEATURES = [
  "Post 1 active advert at a time",
  "Unlimited connections",
  "Gold star verified badge",
  "Social links & highlight reel visible to clubs",
];

function PackageOption({
  pkg,
  label,
  sublabel,
  selected,
  onSelect,
}: {
  pkg: PurchasesPackage | null;
  label: string;
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = useColors();
  if (!pkg) return null;
  const price = pkg.product.priceString;
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.pkgOption,
        {
          backgroundColor: selected ? colors.pitchSoft : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.pkgOptionLeft}>
        <View style={[styles.radio, { borderColor: colors.primary }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
        </View>
        <View>
          <Text style={[styles.pkgLabel, { color: colors.foreground }]}>{label}</Text>
          {sublabel ? <Text style={[styles.pkgSublabel, { color: colors.mutedForeground }]}>{sublabel}</Text> : null}
        </View>
      </View>
      <Text style={[styles.pkgPrice, { color: colors.primary }]}>{price}</Text>
    </Pressable>
  );
}

export default function SubscriptionPaywall({
  visible,
  onClose,
  featureHint,
}: {
  visible: boolean;
  onClose: () => void;
  featureHint?: string;
}) {
  const colors = useColors();
  const { currentAccount } = useSportsConnect();
  const {
    clubMonthlyPackage,
    clubAnnualPackage,
    playerMonthlyPackage,
    playerAnnualPackage,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
    isLoading,
  } = useSubscription();

  const tier: AccountTier = currentAccount?.role === "club" ? "club" : "player";
  const features = tier === "club" ? CLUB_FEATURES : PLAYER_FEATURES;
  const monthlyPkg = tier === "club" ? clubMonthlyPackage : playerMonthlyPackage;
  const annualPkg = tier === "club" ? clubAnnualPackage : playerAnnualPackage;

  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingPkg, setPendingPkg] = useState<PurchasesPackage | null>(null);

  const activePkg = selectedPkg ?? monthlyPkg;

  const handleSubscribe = () => {
    if (!activePkg) return;
    setPendingPkg(activePkg);
    setConfirmVisible(true);
  };

  const confirmPurchase = async () => {
    if (!pendingPkg) return;
    setConfirmVisible(false);
    setErrorMsg(null);
    try {
      await purchase(pendingPkg);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      if (!msg.toLowerCase().includes("cancel")) {
        setErrorMsg(msg);
      }
    }
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    try {
      await restore();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Restore failed");
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.scrim}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={[styles.badgeIcon, { backgroundColor: "#FEF9C3" }]}>
                <Feather name="star" size={24} color="#D97706" />
              </View>
              <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: "auto" })}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {tier === "club" ? `Unlock ${getClubLabel(currentAccount)} Premium` : "Unlock Player Premium"}
              </Text>

              {featureHint ? (
                <View style={[styles.hintBadge, { backgroundColor: colors.amberSoft }]}>
                  <Feather name="lock" size={13} color={colors.accentForeground} />
                  <Text style={[styles.hintText, { color: colors.accentForeground }]}>{featureHint}</Text>
                </View>
              ) : null}

              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {tier === "club"
                  ? `Everything your ${getClubLabel(currentAccount).toLowerCase()} needs to find and connect with the right players and coaches.`
                  : "Stand out to clubs and get unlimited connections."}
              </Text>

              <View style={[styles.featureList, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
                {features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Feather name="check-circle" size={15} color="#16A34A" />
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                  </View>
                ))}
              </View>

              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.packages}>
                  <PackageOption
                    pkg={monthlyPkg}
                    label="Monthly"
                    sublabel="Billed monthly, cancel anytime"
                    selected={activePkg?.identifier === monthlyPkg?.identifier}
                    onSelect={() => setSelectedPkg(monthlyPkg)}
                  />
                  <PackageOption
                    pkg={annualPkg}
                    label="Annual"
                    sublabel="Best value — save ~16%"
                    selected={activePkg?.identifier === annualPkg?.identifier}
                    onSelect={() => setSelectedPkg(annualPkg)}
                  />
                </View>
              )}

              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}

              <Pressable
                onPress={handleSubscribe}
                disabled={isPurchasing || isRestoring || !activePkg}
                style={({ pressed }) => [
                  styles.subscribeBtn,
                  { backgroundColor: colors.primary, opacity: pressed || isPurchasing ? 0.8 : 1 },
                ]}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.subscribeBtnText}>
                    Subscribe {activePkg ? `· ${activePkg.product.priceString}` : ""}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleRestore}
                disabled={isPurchasing || isRestoring}
                style={({ pressed }) => ({ opacity: pressed || isRestoring ? 0.6 : 1, alignItems: "center", paddingVertical: 12 })}
              >
                <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
                  {isRestoring ? "Restoring…" : "Restore purchases"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Test-mode purchase confirmation modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.confirmScrim}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Confirm Test Purchase</Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
              This is a test-store purchase for{" "}
              <Text style={{ fontWeight: "700" }}>{pendingPkg?.product.title ?? "this plan"}</Text> at{" "}
              <Text style={{ fontWeight: "700" }}>{pendingPkg?.product.priceString ?? ""}</Text>.{"\n\n"}
              No real payment will be made.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [styles.confirmBtn, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.secondaryForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmPurchase}
                style={({ pressed }) => [styles.confirmBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%" },
  header: { flexDirection: "row", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 32, gap: 16 },
  title: { fontWeight: "800", fontSize: 22, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
  hintBadge: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  hintText: { fontWeight: "600", fontSize: 13 },
  featureList: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  featureText: { fontWeight: "500", fontSize: 14, lineHeight: 20, flex: 1 },
  packages: { gap: 10 },
  pkgOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, borderWidth: 2, padding: 14, gap: 10 },
  pkgOptionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  pkgLabel: { fontWeight: "700", fontSize: 15 },
  pkgSublabel: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  pkgPrice: { fontWeight: "800", fontSize: 16 },
  errorText: { color: "#DC2626", fontWeight: "600", fontSize: 13, textAlign: "center" },
  subscribeBtn: { borderRadius: 16, minHeight: 52, alignItems: "center", justifyContent: "center" },
  subscribeBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  restoreText: { fontWeight: "600", fontSize: 13 },
  confirmScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  confirmCard: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 22, gap: 12 },
  confirmTitle: { fontWeight: "800", fontSize: 18 },
  confirmBody: { fontSize: 14, lineHeight: 22, fontWeight: "500" },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  confirmBtn: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { fontWeight: "700", fontSize: 15 },
});
