import { Feather } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton, ProfileAvatar, SectionTitle } from "@/components/SportsUI";
import { CoachAffiliate, CoachAffiliateTeam, UserAccount, useSportsConnect } from "@/context/SportsConnectContext";
import { getDefaultAvatar } from "@/constants/defaultAvatars";
import { useColors } from "@/hooks/useColors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coachName(account?: UserAccount) {
  return account?.fullName || "Coach";
}

function coachAvatarUri(account?: UserAccount, getImageUri?: (id?: string, includePending?: boolean) => string | undefined) {
  if (!account?.profileImageId) return undefined;
  return getImageUri?.(account.profileImageId, true);
}

const GENDER_COLORS: Record<CoachAffiliateTeam["gender"], { bg: string; text: string }> = {
  girls: { bg: "#FBCFE8", text: "#9D174D" },  // pink
  boys:  { bg: "#BFDBFE", text: "#1E40AF" },  // blue
  mixed: { bg: "#DDD6FE", text: "#5B21B6" },  // purple
};

function genderLabel(g: CoachAffiliateTeam["gender"]) {
  return g === "girls" ? "Girls" : g === "boys" ? "Boys" : "Mixed";
}

// ---------------------------------------------------------------------------
// TeamChip — one coloured chip per team assignment
// ---------------------------------------------------------------------------

function TeamChip({
  team,
  onRemove,
}: {
  team: CoachAffiliateTeam;
  onRemove?: () => void;
}) {
  const { bg, text } = GENDER_COLORS[team.gender];
  return (
    <View style={[chipStyles.chip, { backgroundColor: bg }]}>
      <Text style={[chipStyles.label, { color: text }]}>
        {genderLabel(team.gender)} {team.ageGroup}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} style={({ pressed }) => [chipStyles.x, { opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="x" size={12} color={text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingVertical: 5, paddingLeft: 12, paddingRight: 8, gap: 4 },
  label: { fontWeight: "700", fontSize: 12 },
  x: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
});

// ---------------------------------------------------------------------------
// AddTeamInlineForm — shown below the chip list when the club taps "+ Add team"
// ---------------------------------------------------------------------------

const GENDERS: CoachAffiliateTeam["gender"][] = ["girls", "boys", "mixed"];

function AddTeamInlineForm({
  onAdd,
  onCancel,
}: {
  onAdd: (team: CoachAffiliateTeam) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const [gender, setGender] = useState<CoachAffiliateTeam["gender"]>("mixed");
  const [ageGroup, setAgeGroup] = useState("");

  const handleAdd = () => {
    const ag = ageGroup.trim();
    if (!ag) {
      Alert.alert("Age group required", "Please enter an age group (e.g. U13, 15s, Open).");
      return;
    }
    onAdd({ gender, ageGroup: ag });
    setAgeGroup("");
    setGender("mixed");
  };

  return (
    <View style={[formStyles.shell, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[formStyles.heading, { color: colors.foreground }]}>Add a team</Text>

      {/* Gender picker */}
      <View style={formStyles.genderRow}>
        {GENDERS.map((g) => {
          const selected = g === gender;
          const { bg, text } = GENDER_COLORS[g];
          return (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              style={({ pressed }) => [
                formStyles.genderBtn,
                { backgroundColor: selected ? bg : colors.secondary, borderColor: selected ? text : colors.border, borderWidth: 2, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[formStyles.genderBtnText, { color: selected ? text : colors.mutedForeground }]}>
                {genderLabel(g)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Age group input */}
      <TextInput
        value={ageGroup}
        onChangeText={setAgeGroup}
        placeholder="Age group  (e.g. U13, 15s, Open)"
        placeholderTextColor={colors.mutedForeground}
        style={[formStyles.input, { backgroundColor: colors.background, borderColor: colors.foreground, color: colors.foreground }]}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
      />

      {/* Actions */}
      <View style={formStyles.actions}>
        <Pressable onPress={onCancel} style={({ pressed }) => [formStyles.btn, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[formStyles.btnText, { color: colors.secondaryForeground }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleAdd} style={({ pressed }) => [formStyles.btn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[formStyles.btnText, { color: colors.primaryForeground }]}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const formStyles = StyleSheet.create({
  shell: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12, marginLeft: 62 },
  heading: { fontWeight: "800", fontSize: 14 },
  genderRow: { flexDirection: "row", gap: 8 },
  genderBtn: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: "center" },
  genderBtnText: { fontWeight: "700", fontSize: 13 },
  input: { borderWidth: 2, borderRadius: 12, minHeight: 44, paddingHorizontal: 14, fontWeight: "600", fontSize: 14 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "700", fontSize: 14 },
});

// ---------------------------------------------------------------------------
// CoachAffiliateRow — card + teams section for each affiliate
// ---------------------------------------------------------------------------

function CoachAffiliateRow({
  affiliate,
  coach,
  onRemove,
  onTap,
  onAddTeam,
  onRemoveTeam,
}: {
  affiliate: CoachAffiliate;
  coach?: UserAccount;
  onRemove: () => void;
  onTap: () => void;
  onAddTeam: (team: CoachAffiliateTeam) => void;
  onRemoveTeam: (idx: number) => void;
}) {
  const colors = useColors();
  const { getImageUri } = useSportsConnect();
  const [showAddForm, setShowAddForm] = useState(false);

  const uri = coachAvatarUri(coach, getImageUri);
  const fallback = getDefaultAvatar("coach", coach?.gender);
  const name = coachName(coach);
  const teams = affiliate.teams ?? [];
  const statusColor = affiliate.status === "active" ? "#16A34A" : affiliate.status === "pending" ? "#D97706" : "#DC2626";
  const isActive = affiliate.status === "active";

  return (
    <View style={{ gap: 6 }}>
      {/* Main row */}
      <Pressable
        onPress={onTap}
        style={({ pressed }) => [
          rowStyles.row,
          { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ProfileAvatar uri={uri} fallback={fallback} size={48} />
        <View style={rowStyles.copy}>
          <Text style={[rowStyles.name, { color: colors.foreground }]}>{name}</Text>
          <View style={[rowStyles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={[rowStyles.statusText, { color: statusColor }]}>{affiliate.status.toUpperCase()}</Text>
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
          style={({ pressed }) => [rowStyles.removeBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="trash-2" size={16} color="#DC2626" />
        </Pressable>
      </Pressable>

      {/* Team chips — only for active affiliates */}
      {isActive && (
        <View style={[rowStyles.teamsBlock, { marginLeft: 62 }]}>
          {teams.length === 0 && !showAddForm ? (
            <Text style={[rowStyles.noTeams, { color: colors.mutedForeground }]}>No teams assigned</Text>
          ) : (
            <View style={rowStyles.chipWrap}>
              {teams.map((t, i) => (
                <TeamChip
                  key={i}
                  team={t}
                  onRemove={() => onRemoveTeam(i)}
                />
              ))}
            </View>
          )}

          {showAddForm ? (
            <AddTeamInlineForm
              onAdd={(team) => {
                onAddTeam(team);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={({ pressed }) => [rowStyles.addTeamBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="plus" size={13} color={colors.primary} />
              <Text style={[rowStyles.addTeamText, { color: colors.primary }]}>Add team</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14 },
  copy: { flex: 1, gap: 4 },
  name: { fontWeight: "700", fontSize: 15 },
  statusBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontWeight: "700", fontSize: 10 },
  removeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  teamsBlock: { gap: 8, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  noTeams: { fontWeight: "500", fontSize: 12, fontStyle: "italic" },
  addTeamBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  addTeamText: { fontWeight: "700", fontSize: 12 },
});

// ---------------------------------------------------------------------------
// CoachSearchPopup
// ---------------------------------------------------------------------------

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
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
                <View key={coach.id} style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
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

// ---------------------------------------------------------------------------
// CoachProfilePopup
// ---------------------------------------------------------------------------

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
            <Text style={[styles.searchName, { color: colors.foreground, fontSize: 22 }]}>{coachName(coach)}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
            {[
              { label: "Full name", value: coach.fullName ?? "" },
              { label: "Gender", value: coach.gender ?? "" },
              { label: "Location", value: coach.location ?? "" },
              ...(coach.mobile ? [{ label: "Mobile", value: coach.mobile }] : []),
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CoachAffiliatesPage({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentAccount, accounts, requestCoachAffiliation, removeCoachAffiliate, addCoachAffiliateTeam, removeCoachAffiliateTeam } = useSportsConnect();
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<UserAccount | undefined>();
  const [showCoachProfile, setShowCoachProfile] = useState(false);

  const affiliates = currentAccount?.coachAffiliates ?? [];
  const clubSport = currentAccount?.defaultSport ?? "";

  const handleRequest = (coachId: string) => {
    requestCoachAffiliation(coachId);
    setShowSearch(false);
  };

  const handleTap = (affiliate: CoachAffiliate) => {
    const coach = accounts.find((a) => a.id === affiliate.coachAccountId);
    setSelectedCoach(coach);
    setShowCoachProfile(true);
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
              <CoachAffiliateRow
                key={affiliate.coachAccountId}
                affiliate={affiliate}
                coach={coach}
                onRemove={() => removeCoachAffiliate(affiliate.coachAccountId)}
                onTap={() => handleTap(affiliate)}
                onAddTeam={(team) => addCoachAffiliateTeam(affiliate.coachAccountId, team)}
                onRemoveTeam={(idx) => removeCoachAffiliateTeam(affiliate.coachAccountId, idx)}
              />
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontWeight: "800", fontSize: 18, flex: 1, textAlign: "center" },
  content: { paddingHorizontal: 20, gap: 14, paddingTop: 16 },
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
});
