import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState, useMemo } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton, ProfileAvatar, SectionTitle } from "@/components/SportsUI";
import { CoachAffiliate, UserAccount, useSportsConnect } from "@/context/SportsConnectContext";
import { getDefaultAvatar } from "@/constants/defaultAvatars";
import { useColors } from "@/hooks/useColors";

function coachName(account?: UserAccount) {
  return account?.fullName || "Coach";
}

function coachAvatarUri(account?: UserAccount, getImageUri?: (id?: string, includePending?: boolean) => string | undefined) {
  if (!account?.profileImageId) return undefined;
  return getImageUri?.(account.profileImageId, true);
}

function CoachAffiliateRow({
  affiliate,
  coach,
  onRemove,
  onTap,
}: {
  affiliate: CoachAffiliate;
  coach?: UserAccount;
  onRemove: () => void;
  onTap: () => void;
}) {
  const colors = useColors();
  const { getImageUri } = useSportsConnect();
  const uri = coachAvatarUri(coach, getImageUri);
  const fallback = getDefaultAvatar("coach", coach?.gender);
  const name = coachName(coach);
  const detail = [affiliate.teamName, affiliate.ageGroup].filter(Boolean).join(" · ");
  const statusColor = affiliate.status === "active" ? "#16A34A" : affiliate.status === "pending" ? "#D97706" : "#DC2626";

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <ProfileAvatar uri={uri} fallback={fallback} size={48} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowName, { color: colors.foreground }]}>{name}</Text>
        {detail ? <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{affiliate.status.toUpperCase()}</Text>
        </View>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          Alert.alert(
            "Remove affiliate",
            `Removing ${name} will close all active adverts and chats tied to this affiliation. This cannot be undone.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: onRemove },
            ]
          );
        }}
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Feather name="trash-2" size={16} color="#DC2626" />
      </Pressable>
    </Pressable>
  );
}

function CoachSearchPopup({
  visible,
  onClose,
  onRequest,
  clubSport,
}: {
  visible: boolean;
  onClose: () => void;
  onRequest: (coachId: string) => void;
  clubSport: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, currentAccount, getImageUri } = useSportsConnect();
  const [query, setQuery] = useState("");

  const coaches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (a.role !== "coach") return false;
      if (a.id === currentAccount?.id) return false;
      const matchesSport = a.sports.includes(clubSport);
      const matchesName = !q || a.fullName?.toLowerCase().includes(q) || false;
      return matchesSport && matchesName;
    });
  }, [accounts, currentAccount, clubSport, query]);

  const existingAffiliates = currentAccount?.coachAffiliates ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.popupShell, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        <View style={styles.popupHeader}>
          <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.popupTitle, { color: colors.foreground }]}>Add Coach Affiliate</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={[styles.popupSubtitle, { color: colors.mutedForeground }]}>
          Search coaches by name. Only coaches who play {clubSport} are shown.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
        <ScrollView contentContainerStyle={[styles.popupList, { paddingBottom: insets.bottom + 20 }]}>
          {coaches.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No coaches found.</Text>
          ) : (
            coaches.map((coach) => {
              const existing = existingAffiliates.find((a) => a.coachAccountId === coach.id);
              const isBlocked = existing?.status === "blocked";
              const isRejected = existing?.status === "rejected";
              const canRequest = !existing || (isRejected && existing.rejectedAt && Date.now() > new Date(existing.rejectedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
              const cooldownText = isRejected && existing?.rejectedAt
                ? `Available after ${new Date(new Date(existing.rejectedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                : "";
              return (
                <View key={coach.id} style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ProfileAvatar uri={coachAvatarUri(coach, getImageUri)} fallback={getDefaultAvatar("coach", coach.gender)} size={44} />
                  <View style={styles.searchRowCopy}>
                    <Text style={[styles.searchName, { color: colors.foreground }]}>{coachName(coach)}</Text>
                    <Text style={[styles.searchMeta, { color: colors.mutedForeground }]}>{coach.sports.join(", ")}</Text>
                  </View>
                  {isBlocked ? (
                    <Text style={[styles.blockedText, { color: "#DC2626" }]}>Blocked</Text>
                  ) : canRequest ? (
                    <Pressable
                      onPress={() => onRequest(coach.id)}
                      style={({ pressed }) => [styles.requestBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={[styles.requestBtnText, { color: colors.primaryForeground }]}>Request</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.cooldownText, { color: colors.mutedForeground }]}>{cooldownText || "Pending"}</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function CoachProfilePopup({
  visible,
  onClose,
  coach,
}: {
  visible: boolean;
  onClose: () => void;
  coach?: UserAccount;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getImageUri } = useSportsConnect();
  if (!coach) return null;
  const uri = coachAvatarUri(coach, getImageUri);
  const fallback = getDefaultAvatar("coach", coach.gender);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.popupShell, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        <View style={styles.popupHeader}>
          <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.popupTitle, { color: colors.foreground }]}>Coach Profile</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.popupList, { paddingBottom: insets.bottom + 20 }]}>
          <View style={{ alignItems: "center", gap: 12, marginBottom: 20 }}>
            <ProfileAvatar uri={uri} fallback={fallback} size={96} />
            <Text style={[styles.rowName, { color: colors.foreground, fontSize: 22 }]}>{coachName(coach)}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: "Full name", value: coach.fullName ?? "" },
              { label: "Gender", value: coach.gender ?? "" },
              { label: "Location", value: coach.location ?? "" },
              { label: "Mobile", value: coach.mobile ?? "" },
              { label: "Sports", value: coach.sports.join(", ") },
              { label: "Bio", value: coach.bio ?? "" },
            ].filter((r) => r.value).map((r) => (
              <View key={r.label} style={styles.infoRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{r.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function CoachAffiliatesPage({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentAccount, accounts, requestCoachAffiliation, removeCoachAffiliate, updateCoachAffiliateDetails } = useSportsConnect();
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<UserAccount | undefined>();
  const [showCoachProfile, setShowCoachProfile] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<CoachAffiliate | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editAgeGroup, setEditAgeGroup] = useState("");

  const affiliates = currentAccount?.coachAffiliates ?? [];
  const clubSport = currentAccount?.defaultSport ?? "";

  const handleRequest = (coachId: string) => {
    requestCoachAffiliation(coachId);
    setShowSearch(false);
  };

  const handleRemove = (coachId: string) => {
    removeCoachAffiliate(coachId);
  };

  const handleTap = (affiliate: CoachAffiliate) => {
    const coach = accounts.find((a) => a.id === affiliate.coachAccountId);
    setSelectedCoach(coach);
    setShowCoachProfile(true);
  };

  const startEdit = (affiliate: CoachAffiliate) => {
    setEditingAffiliate(affiliate);
    setEditTeamName(affiliate.teamName ?? "");
    setEditAgeGroup(affiliate.ageGroup ?? "");
  };

  const saveEdit = () => {
    if (!editingAffiliate) return;
    updateCoachAffiliateDetails(editingAffiliate.coachAccountId, editTeamName.trim() || undefined, editAgeGroup.trim() || undefined);
    setEditingAffiliate(null);
  };

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Coach Affiliates</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <SectionTitle title="Affiliated coaches" action={`${affiliates.length}`} />
        {affiliates.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No coach affiliates yet. Tap "Add a Coach Affiliate" to get started.
          </Text>
        ) : (
          affiliates.map((affiliate) => {
            const coach = accounts.find((a) => a.id === affiliate.coachAccountId);
            return (
              <View key={affiliate.coachAccountId}>
                <CoachAffiliateRow
                  affiliate={affiliate}
                  coach={coach}
                  onRemove={() => handleRemove(affiliate.coachAccountId)}
                  onTap={() => handleTap(affiliate)}
                />
                {affiliate.status === "active" && (
                  <Pressable
                    onPress={() => startEdit(affiliate)}
                    style={({ pressed }) => [styles.editRowBtn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Feather name="edit-2" size={13} color={colors.primary} />
                    <Text style={[styles.editRowText, { color: colors.primary }]}>Edit team / age group</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}

        <PrimaryButton label="Add a Coach Affiliate" icon="plus" onPress={() => setShowSearch(true)} />
      </ScrollView>

      <CoachSearchPopup
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onRequest={handleRequest}
        clubSport={clubSport}
      />

      <CoachProfilePopup
        visible={showCoachProfile}
        onClose={() => setShowCoachProfile(false)}
        coach={selectedCoach}
      />

      <Modal visible={editingAffiliate !== null} transparent animationType="fade" onRequestClose={() => setEditingAffiliate(null)}>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit team details</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Team name</Text>
            <TextInput
              value={editTeamName}
              onChangeText={setEditTeamName}
              placeholder="e.g. Under-12s"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Age group</Text>
            <TextInput
              value={editAgeGroup}
              onChangeText={setEditAgeGroup}
              placeholder="e.g. Ages 12-15"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingAffiliate(null)} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontWeight: "800", fontSize: 18, flex: 1, textAlign: "center" },
  content: { paddingHorizontal: 20, gap: 14, paddingTop: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
  rowCopy: { flex: 1, gap: 3 },
  rowName: { fontWeight: "700", fontSize: 15 },
  rowDetail: { fontWeight: "500", fontSize: 12 },
  statusBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  statusText: { fontWeight: "700", fontSize: 10 },
  removeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editRowBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 62, marginTop: 4, marginBottom: 8 },
  editRowText: { fontWeight: "600", fontSize: 12 },
  emptyText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center", marginVertical: 20 },
  popupShell: { flex: 1, paddingHorizontal: 20 },
  popupHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  popupTitle: { fontWeight: "800", fontSize: 18, flex: 1, textAlign: "center" },
  popupSubtitle: { fontWeight: "500", fontSize: 13, marginBottom: 14 },
  searchInput: { borderWidth: 1, borderRadius: 14, minHeight: 46, paddingHorizontal: 14, fontWeight: "600", fontSize: 15, marginBottom: 14 },
  popupList: { gap: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  searchRowCopy: { flex: 1, gap: 2 },
  searchName: { fontWeight: "700", fontSize: 15 },
  searchMeta: { fontWeight: "500", fontSize: 12 },
  requestBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  requestBtnText: { fontWeight: "700", fontSize: 13 },
  blockedText: { fontWeight: "700", fontSize: 12 },
  cooldownText: { fontWeight: "500", fontSize: 11 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  infoRow: { gap: 3 },
  fieldLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontWeight: "600", fontSize: 15, lineHeight: 20 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 22, gap: 10 },
  modalTitle: { fontWeight: "800", fontSize: 17, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 46, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
});
