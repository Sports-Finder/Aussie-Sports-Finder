import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatRoom } from "@/app/(tabs)/messages";
import { EmptyState, Field, Pill, PrimaryButton, SectionTitle } from "@/components/SportsUI";
import {
  AccountRole,
  AccountStatus,
  Advert,
  UserAccount,
  useSportsConnect,
} from "@/context/SportsConnectContext";
import type { ClubApprovalStatus } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

type Section = "overview" | "adverts" | "chats" | "accounts" | "moderation" | "clubapprovals" | "settings";

const sections: { key: Section; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "adverts", label: "Adverts", icon: "clipboard" },
  { key: "chats", label: "Chats", icon: "message-circle" },
  { key: "accounts", label: "Accounts", icon: "users" },
  { key: "moderation", label: "Moderation", icon: "shield" },
  { key: "clubapprovals", label: "Club Approvals", icon: "check-circle" },
  { key: "settings", label: "Settings", icon: "settings" },
];

const roleLabels: Record<AccountRole, string> = {
  player: "Player (18+)",
  guardian: "Parent / Guardian",
  coach: "Coach",
  club: "Club",
};

const roleIcons: Record<AccountRole, keyof typeof Feather.glyphMap> = {
  player: "user",
  guardian: "users",
  coach: "award",
  club: "shield",
};

const advertTypeLabels: Record<Advert["type"], string> = {
  "coach-looking": "Coach/Player Looking",
  "player-looking": "Coach/Player Looking",
  "players-wanted": "Players Wanted",
  "club-trials": "Club Trials",
  "coach-wanted": "Coach Wanted",
};

const statusBadgeColor = (status?: AccountStatus | "active" | "closed") => {
  if (status === "banned") return { bg: "#FEE2E2", fg: "#991B1B" };
  if (status === "closed") return { bg: "#E5E7EB", fg: "#4B5563" };
  return { bg: "#DCFCE7", fg: "#166534" };
};

function AdminContent({ onExit }: { onExit?: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("overview");

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
          <Feather name="shield" size={16} color={colors.primaryForeground} />
          <Text style={[styles.adminBadgeText, { color: colors.primaryForeground }]}>ADMIN</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage adverts, chats, accounts and approvals.</Text>
        </View>
        {onExit ? (
          <Pressable onPress={onExit} style={[styles.closeBtn, { backgroundColor: "#EF4444" }]}>
            <Feather name="log-out" size={18} color="#FFF" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={{ flexGrow: 0 }}
      >
        {sections.map((s) => {
          const active = section === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSection(s.key)}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name={s.icon} size={15} color={active ? colors.primaryForeground : colors.foreground} />
              <Text style={[styles.tabLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        {section === "overview" && <OverviewSection setSection={setSection} />}
        {section === "adverts" && <AdvertsSection />}
        {section === "chats" && <ChatsSection />}
        {section === "accounts" && <AccountsSection />}
        {section === "moderation" && <ModerationSection />}
        {section === "clubapprovals" && <ClubApprovalsSection />}
        {section === "settings" && <SettingsSection onClose={onExit} />}
      </View>
    </View>
  );
}

export function AdminDashboard({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <AdminContent />
    </Modal>
  );
}

export function AdminPage({ onExit }: { onExit: () => void }) {
  return <AdminContent onExit={onExit} />;
}

function StatCard({ label, value, icon, color, onPress }: { label: string; value: number; icon: keyof typeof Feather.glyphMap; color: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function OverviewSection({ setSection }: { setSection: (s: Section) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { adverts, conversations, accounts, bannedEmails, profileImages, pendingHighlightLinks, pendingSportRequests } = useSportsConnect();

  const activeAdverts = adverts.filter((a) => a.status !== "closed").length;
  const closedAdverts = adverts.filter((a) => a.status === "closed").length;
  const pendingImages = profileImages.filter((i) => i.status === "pending").length;
  const pendingHighlights = pendingHighlightLinks.filter((l) => l.status === "pending").length;
  const pendingSports = pendingSportRequests.filter((r) => r.status === "pending").length;
  const bannedAccounts = accounts.filter((a) => a.status === "banned").length;
  const pendingClubApprovals = accounts.filter((a) => a.role === "club" && (!a.clubApprovalStatus || a.clubApprovalStatus === "pending")).length;

  const countsByRole = (role: AccountRole) => accounts.filter((a) => a.role === role).length;

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
      <SectionTitle title="App snapshot" />
      <View style={styles.statsGrid}>
        <StatCard label="Active adverts" value={activeAdverts} icon="clipboard" color="#10B981" onPress={() => setSection("adverts")} />
        <StatCard label="Closed adverts" value={closedAdverts} icon="archive" color="#6B7280" onPress={() => setSection("adverts")} />
        <StatCard label="Conversations" value={conversations.length} icon="message-circle" color="#3B82F6" onPress={() => setSection("chats")} />
        <StatCard label="Accounts" value={accounts.length} icon="users" color="#8B5CF6" onPress={() => setSection("accounts")} />
        <StatCard label="Banned accounts" value={bannedAccounts} icon="user-x" color="#EF4444" onPress={() => setSection("accounts")} />
        <StatCard label="Banned emails" value={bannedEmails.length} icon="slash" color="#DC2626" onPress={() => setSection("settings")} />
      </View>

      <SectionTitle title="Accounts by role" />
      <View style={styles.statsGrid}>
        {(Object.keys(roleLabels) as AccountRole[]).map((role) => (
          <StatCard key={role} label={roleLabels[role]} value={countsByRole(role)} icon={roleIcons[role]} color={colors.primary} onPress={() => setSection("accounts")} />
        ))}
      </View>

      <SectionTitle title="Pending moderation" />
      <View style={styles.statsGrid}>
        <StatCard label="Profile images" value={pendingImages} icon="image" color="#F59E0B" onPress={() => setSection("moderation")} />
        <StatCard label="Highlight reels" value={pendingHighlights} icon="video" color="#F59E0B" onPress={() => setSection("moderation")} />
        <StatCard label="Sport requests" value={pendingSports} icon="plus-circle" color="#F59E0B" onPress={() => setSection("moderation")} />
        <StatCard label="Club approvals" value={pendingClubApprovals} icon="check-circle" color="#EF4444" onPress={() => setSection("clubapprovals")} />
      </View>
    </ScrollView>
  );
}

function AdvertsSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { adverts, accounts, conversations, adminSetAdvertStatus, updateAdvert } = useSportsConnect();
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");
  const [editing, setEditing] = useState<Advert | null>(null);

  const filtered = useMemo(() => {
    return adverts
      .filter((a) => {
        if (filter === "active") return a.status !== "closed";
        if (filter === "closed") return a.status === "closed";
        return true;
      })
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [adverts, filter]);

  const ownerName = (advert: Advert) => {
    const owner = accounts.find((a) => a.id === advert.ownerAccountId);
    if (!owner) return advert.postedBy;
    return owner.clubName || owner.fullName || owner.playerName || advert.postedBy;
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        <SectionTitle title="All adverts" action={`${filtered.length} of ${adverts.length}`} />
        <View style={styles.pillRow}>
          <Pill label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <Pill label="Active" active={filter === "active"} onPress={() => setFilter("active")} />
          <Pill label="Closed" active={filter === "closed"} onPress={() => setFilter("closed")} />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon="clipboard" title="No adverts" text="There are no adverts in this filter." />
        ) : (
          filtered.map((advert) => {
            const isClosed = advert.status === "closed";
            const badge = statusBadgeColor(isClosed ? "closed" : "active");
            return (
              <View key={advert.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={2}>{advert.title}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{isClosed ? "Closed" : "Active"}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="user" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{ownerName(advert)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="tag" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{advertTypeLabels[advert.type]} · {advert.sport}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{advert.location}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="trending-up" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{advert.level}</Text>
                </View>
                {advert.availability ? (
                  <View style={styles.metaRow}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{advert.availability}</Text>
                  </View>
                ) : null}
                {advert.ageGroup ? (
                  <View style={styles.metaRow}>
                    <Feather name="users" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Age group: {advert.ageGroup}</Text>
                  </View>
                ) : null}
                {advert.preferredAge !== undefined ? (
                  <View style={styles.metaRow}>
                    <Feather name="user-check" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Preferred age: {advert.preferredAge}</Text>
                  </View>
                ) : null}
                {advert.positions && advert.positions.length > 0 ? (
                  <View style={styles.metaRow}>
                    <Feather name="target" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Positions: {advert.positions.join(", ")}</Text>
                  </View>
                ) : null}
                {advert.playerDescription ? (
                  <View style={styles.metaRow}>
                    <Feather name="info" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{advert.playerDescription}</Text>
                  </View>
                ) : null}
                {advert.trainingDays && advert.trainingDays.length > 0 ? (
                  <View style={styles.metaRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Training: {advert.trainingDays.join(", ")} {advert.trainingTimeFrom}–{advert.trainingTimeTo}</Text>
                  </View>
                ) : advert.trainingTbd ? (
                  <View style={styles.metaRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Training: TBC</Text>
                  </View>
                ) : null}
                {advert.gameDays && advert.gameDays.length > 0 ? (
                  <View style={styles.metaRow}>
                    <Feather name="flag" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Games: {advert.gameDays.join(", ")} {advert.gameTimeFrom}–{advert.gameTimeTo}</Text>
                  </View>
                ) : advert.gameTbd ? (
                  <View style={styles.metaRow}>
                    <Feather name="flag" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Games: TBC</Text>
                  </View>
                ) : null}
                {advert.scheduleNote ? (
                  <View style={styles.metaRow}>
                    <Feather name="file-text" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{advert.scheduleNote}</Text>
                  </View>
                ) : null}
                {advert.trialSlots && advert.trialSlots.length > 0 ? (
                  <View style={styles.metaRow}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Trial slots: {advert.trialSlots.map((t) => `${t.date} ${t.timeFrom}–${t.timeTo}`).join(", ")}</Text>
                  </View>
                ) : null}
                {advert.trialRequired !== undefined ? (
                  <View style={styles.metaRow}>
                    <Feather name="check-square" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Trial required: {advert.trialRequired ? "Yes" : "No"}</Text>
                  </View>
                ) : null}
                {advert.coachRole ? (
                  <View style={styles.metaRow}>
                    <Feather name="award" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Coach role: {advert.coachRole}</Text>
                  </View>
                ) : null}
                {advert.coachExperienceLevel ? (
                  <View style={styles.metaRow}>
                    <Feather name="bar-chart" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Exp level: {advert.coachExperienceLevel}</Text>
                  </View>
                ) : null}
                {advert.coachPositionTypes && advert.coachPositionTypes.length > 0 ? (
                  <View style={styles.metaRow}>
                    <Feather name="layers" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Position types: {advert.coachPositionTypes.join(", ")}</Text>
                  </View>
                ) : null}
                {advert.coachSalaryTbc ? (
                  <View style={styles.metaRow}>
                    <Feather name="dollar-sign" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Salary: TBC / Negotiable</Text>
                  </View>
                ) : advert.coachSalary !== undefined ? (
                  <View style={styles.metaRow}>
                    <Feather name="dollar-sign" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Salary: AUD ${advert.coachSalary.toFixed(2)}</Text>
                  </View>
                ) : null}
                {advert.feesFree ? (
                  <View style={styles.metaRow}>
                    <Feather name="heart" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Fees: Free / Scholarship</Text>
                  </View>
                ) : advert.seasonFees !== undefined ? (
                  <View style={styles.metaRow}>
                    <Feather name="dollar-sign" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Season fees: AUD ${advert.seasonFees.toFixed(2)}{advert.feesNegotiable ? " (negotiable)" : ""}</Text>
                  </View>
                ) : null}
                {advert.description ? (
                  <Text style={[styles.itemBody, { color: colors.foreground }]} numberOfLines={3}>{advert.description}</Text>
                ) : null}
                {advert.needs ? (
                  <Text style={[styles.itemBody, { color: colors.foreground }]} numberOfLines={3}>{advert.needs}</Text>
                ) : null}
                {advert.closedReason ? (
                  <View style={styles.metaRow}>
                    <Feather name="x-circle" size={12} color="#EF4444" />
                    <Text style={[styles.metaText, { color: "#EF4444" }]}>Closed: {advert.closedReason}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Posted: {advert.createdAt.slice(0, 10)} · Distance: {advert.distanceKm} km</Text>
                </View>
                <View style={styles.actionRow}>
                  <ActionButton icon="edit-2" label="Edit" color={colors.primary} onPress={() => setEditing(advert)} />
                  {isClosed ? (
                    <ActionButton icon="rotate-ccw" label="Reopen" color="#10B981" onPress={() => adminSetAdvertStatus(advert.id, "active")} />
                  ) : (
                    <ActionButton icon="x-circle" label="Close" color="#EF4444" onPress={() => {
                      const linkedChats = conversations.filter((c) => c.advertId === advert.id && (c.status === "pending" || c.status === "connected"));
                      const chatCount = linkedChats.length;
                      const warning = chatCount > 0
                        ? `This advert has ${chatCount} open or pending chat${chatCount === 1 ? "" : "s"}. Closing will remove it from the public feed. You can reopen it later.\n\nDelete the chats too, or keep them?`
                        : "This will hide the advert from the public feed. You can reopen it later.";
                      const buttons: { text: string; style?: "cancel" | "default" | "destructive"; onPress?: () => void }[] = [
                        { text: "Cancel", style: "cancel" },
                      ];
                      if (chatCount > 0) {
                        buttons.push({ text: "Close + Delete chats", style: "destructive", onPress: () => adminSetAdvertStatus(advert.id, "closed", "Closed by admin", true) });
                      }
                      buttons.push({ text: chatCount > 0 ? "Close only" : "Close advert", style: "destructive", onPress: () => adminSetAdvertStatus(advert.id, "closed", "Closed by admin") });
                      Alert.alert("Close advert?", warning, buttons);
                    }} />
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {editing && (
        <AdvertEditModal
          advert={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateAdvert(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function AdvertEditModal({ advert, onClose, onSave }: { advert: Advert; onClose: () => void; onSave: (patch: Partial<Advert>) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(advert.title);
  const [description, setDescription] = useState(advert.description);
  const [location, setLocation] = useState(advert.location);
  const [level, setLevel] = useState(advert.level);
  const [availability, setAvailability] = useState(advert.availability);
  const [needs, setNeeds] = useState(advert.needs);
  const [ageGroup, setAgeGroup] = useState(advert.ageGroup ?? "");
  const [preferredAge, setPreferredAge] = useState(advert.preferredAge?.toString() ?? "");
  const [positions, setPositions] = useState(advert.positions?.join(", ") ?? "");
  const [playerDescription, setPlayerDescription] = useState(advert.playerDescription ?? "");
  const [trainingDays, setTrainingDays] = useState(advert.trainingDays?.join(", ") ?? "");
  const [trainingTimeFrom, setTrainingTimeFrom] = useState(advert.trainingTimeFrom ?? "");
  const [trainingTimeTo, setTrainingTimeTo] = useState(advert.trainingTimeTo ?? "");
  const [gameDays, setGameDays] = useState(advert.gameDays?.join(", ") ?? "");
  const [gameTimeFrom, setGameTimeFrom] = useState(advert.gameTimeFrom ?? "");
  const [gameTimeTo, setGameTimeTo] = useState(advert.gameTimeTo ?? "");
  const [scheduleNote, setScheduleNote] = useState(advert.scheduleNote ?? "");
  const [coachRole, setCoachRole] = useState(advert.coachRole ?? "");
  const [coachExperienceLevel, setCoachExperienceLevel] = useState(advert.coachExperienceLevel ?? "");
  const [coachPositionTypes, setCoachPositionTypes] = useState(advert.coachPositionTypes?.join(", ") ?? "");
  const [coachSalary, setCoachSalary] = useState(advert.coachSalary?.toString() ?? "");
  const [coachSalaryTbc, setCoachSalaryTbc] = useState(advert.coachSalaryTbc ?? false);
  const [seasonFees, setSeasonFees] = useState(advert.seasonFees?.toString() ?? "");
  const [feesNegotiable, setFeesNegotiable] = useState(advert.feesNegotiable ?? false);
  const [feesFree, setFeesFree] = useState(advert.feesFree ?? false);
  const [trialRequired, setTrialRequired] = useState(advert.trialRequired ?? false);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.shell, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
            <Feather name="edit-2" size={14} color={colors.primaryForeground} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>Edit advert</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{advert.title}</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Core details</Text>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Description" value={description} onChangeText={setDescription} multiline />
          <Field label="Location" value={location} onChangeText={setLocation} />
          <Field label="Level" value={level} onChangeText={setLevel} />
          <Field label="Availability" value={availability} onChangeText={setAvailability} />
          <Field label="Needs / requirements" value={needs} onChangeText={setNeeds} multiline />

          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Player / position info</Text>
          <Field label="Age group" value={ageGroup} onChangeText={setAgeGroup} />
          <Field label="Preferred age" value={preferredAge} onChangeText={setPreferredAge} keyboardType="number-pad" />
          <Field label="Positions (comma-separated)" value={positions} onChangeText={setPositions} />
          <Field label="Player description" value={playerDescription} onChangeText={setPlayerDescription} multiline />

          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Training & games</Text>
          <Field label="Training days (comma-separated)" value={trainingDays} onChangeText={setTrainingDays} />
          <Field label="Training time from" value={trainingTimeFrom} onChangeText={setTrainingTimeFrom} />
          <Field label="Training time to" value={trainingTimeTo} onChangeText={setTrainingTimeTo} />
          <Field label="Game days (comma-separated)" value={gameDays} onChangeText={setGameDays} />
          <Field label="Game time from" value={gameTimeFrom} onChangeText={setGameTimeFrom} />
          <Field label="Game time to" value={gameTimeTo} onChangeText={setGameTimeTo} />
          <Field label="Schedule note" value={scheduleNote} onChangeText={setScheduleNote} multiline />

          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Coach role info</Text>
          <Field label="Coach role" value={coachRole} onChangeText={setCoachRole} />
          <Field label="Coach experience level" value={coachExperienceLevel} onChangeText={setCoachExperienceLevel} />
          <Field label="Position types (comma-separated)" value={coachPositionTypes} onChangeText={setCoachPositionTypes} />
          <Field label="Coach salary" value={coachSalary} onChangeText={setCoachSalary} keyboardType="decimal-pad" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Pressable onPress={() => setCoachSalaryTbc((v) => !v)} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: coachSalaryTbc ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {coachSalaryTbc && <Feather name="check" size={14} color="#FFF" />}
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>Salary TBC / Negotiable</Text>
          </View>

          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Fees</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Pressable onPress={() => setFeesFree((v) => !v)} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: feesFree ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {feesFree && <Feather name="check" size={14} color="#FFF" />}
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>Free / Scholarship</Text>
          </View>
          {!feesFree && (
            <>
              <Field label="Season fees" value={seasonFees} onChangeText={setSeasonFees} keyboardType="decimal-pad" />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Pressable onPress={() => setFeesNegotiable((v) => !v)} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: feesNegotiable ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {feesNegotiable && <Feather name="check" size={14} color="#FFF" />}
                </Pressable>
                <Text style={{ color: colors.foreground, fontSize: 14 }}>Negotiable</Text>
              </View>
            </>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Pressable onPress={() => setTrialRequired((v) => !v)} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: trialRequired ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {trialRequired && <Feather name="check" size={14} color="#FFF" />}
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>Trial required</Text>
          </View>

          <PrimaryButton label="Save changes" icon="check" onPress={() => onSave({
            title, description, location, level, availability, needs,
            ageGroup: ageGroup.trim() || undefined,
            preferredAge: preferredAge.trim() ? parseInt(preferredAge, 10) : undefined,
            positions: positions.split(",").map((s) => s.trim()).filter(Boolean),
            playerDescription: playerDescription.trim() || undefined,
            trainingDays: trainingDays.split(",").map((s) => s.trim()).filter(Boolean),
            trainingTimeFrom: trainingTimeFrom.trim() || undefined,
            trainingTimeTo: trainingTimeTo.trim() || undefined,
            gameDays: gameDays.split(",").map((s) => s.trim()).filter(Boolean),
            gameTimeFrom: gameTimeFrom.trim() || undefined,
            gameTimeTo: gameTimeTo.trim() || undefined,
            scheduleNote: scheduleNote.trim() || undefined,
            coachRole: coachRole.trim() || undefined,
            coachExperienceLevel: coachExperienceLevel.trim() || undefined,
            coachPositionTypes: coachPositionTypes.split(",").map((s) => s.trim()).filter(Boolean),
            coachSalary: coachSalary.trim() ? parseFloat(coachSalary) : undefined,
            coachSalaryTbc,
            seasonFees: seasonFees.trim() ? parseFloat(seasonFees) : undefined,
            feesNegotiable,
            feesFree,
            trialRequired,
          })} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function ChatsSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations } = useSportsConnect();
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = openedId ? conversations.find((c) => c.id === openedId) ?? null : null;

  return (
    <>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        <SectionTitle title="All conversations" action={`${conversations.length} total`} />
        {conversations.length === 0 ? (
          <EmptyState icon="message-circle" title="No conversations" text="No chats have started yet." />
        ) : (
          conversations.map((conv) => {
            const status = conv.status;
            const badge = status === "connected"
              ? { bg: "#DCFCE7", fg: "#166534", label: "Connected" }
              : status === "pending"
              ? { bg: "#FEF3C7", fg: "#92400E", label: "Pending" }
              : { bg: "#E5E7EB", fg: "#4B5563", label: "Denied" };
            const last = conv.messages[0];
            return (
              <Pressable
                key={conv.id}
                onPress={() => setOpenedId(conv.id)}
                style={({ pressed }) => [styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {conv.clubName} <Text style={{ color: colors.mutedForeground }}>↔</Text> {conv.playerName}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="tag" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{conv.sport ?? "—"} · advert "{conv.advertTitle ?? "—"}"</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="message-square" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{conv.messages.length} messages</Text>
                </View>
                {last ? (
                  <Text style={[styles.itemBody, { color: colors.foreground, fontStyle: last.isSystem ? "italic" : "normal" }]} numberOfLines={2}>
                    {last.isAdmin ? "[ADMIN] " : ""}{last.body}
                  </Text>
                ) : null}
                <View style={styles.actionRow}>
                  <ActionButton icon="message-circle" label="Open as Admin" color={colors.primary} onPress={() => setOpenedId(conv.id)} />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      {openedId && <ChatRoom conversationId={openedId} onClose={() => setOpenedId(null)} asAdmin />}
    </>
  );
}

function AccountsSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, bannedEmails, adminApproveClub, adminRejectClub } = useSportsConnect();
  const [role, setRole] = useState<AccountRole>("player");
  const [editing, setEditing] = useState<UserAccount | null>(null);

  const list = useMemo(() => accounts.filter((a) => a.role === role).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), [accounts, role]);

  const displayName = (acc: UserAccount) => acc.clubName || acc.fullName || acc.playerName || acc.email;

  return (
    <>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        <SectionTitle title="Accounts" action={`${list.length} ${roleLabels[role]}`} />
        <View style={styles.pillRow}>
          {(Object.keys(roleLabels) as AccountRole[]).map((r) => (
            <Pill key={r} label={roleLabels[r]} active={role === r} onPress={() => setRole(r)} />
          ))}
        </View>

        {list.length === 0 ? (
          <EmptyState icon="users" title={`No ${roleLabels[role].toLowerCase()} accounts`} text="No accounts in this category yet." />
        ) : (
          list.map((acc) => {
            const status = acc.status ?? "active";
            const badge = statusBadgeColor(status);
            const clubApproval = acc.role === "club" ? (acc.clubApprovalStatus ?? "pending") : null;
            return (
              <Pressable
                key={acc.id}
                onPress={() => setEditing(acc)}
                style={({ pressed }) => [styles.itemCard, { backgroundColor: colors.card, borderColor: clubApproval === "pending" ? "#FDE68A" : colors.border, borderWidth: clubApproval === "pending" ? 1.5 : 1, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{displayName(acc)}</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {clubApproval && (
                      <View style={[styles.badge, { backgroundColor: clubApproval === "approved" ? "#D1FAE5" : clubApproval === "rejected" ? "#FEE2E2" : "#FEF3C7" }]}>
                        <Text style={[styles.badgeText, { color: clubApproval === "approved" ? "#065F46" : clubApproval === "rejected" ? "#991B1B" : "#92400E", fontSize: 11 }]}>
                          {clubApproval === "approved" ? "Approved" : clubApproval === "rejected" ? "Rejected" : "Waiting Approval"}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.fg }]}>{status[0].toUpperCase() + status.slice(1)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="mail" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{acc.email}</Text>
                </View>
                {acc.location ? (
                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{acc.location}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Feather name="activity" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Default sport: {acc.defaultSport}</Text>
                </View>
                {acc.role === "club" && clubApproval !== "approved" && (
                  <View style={styles.actionRow}>
                    <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => {
                      Alert.alert("Approve Club", `Approve "${acc.clubName ?? acc.email}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Approve", onPress: () => adminApproveClub(acc.id) },
                      ]);
                    }} />
                    <ActionButton icon="x" label="Reject" color="#EF4444" onPress={() => {
                      Alert.alert("Reject Club", `Reject "${acc.clubName ?? acc.email}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Reject", style: "destructive", onPress: () => adminRejectClub(acc.id) },
                      ]);
                    }} />
                  </View>
                )}
                <View style={styles.actionRow}>
                  <ActionButton icon="edit-2" label="View / Edit" color={colors.primary} onPress={() => setEditing(acc)} />
                </View>
              </Pressable>
            );
          })
        )}

        {bannedEmails.length > 0 ? (
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {bannedEmails.length} email{bannedEmails.length === 1 ? "" : "s"} are currently banned. Manage them in Settings.
          </Text>
        ) : null}
      </ScrollView>

      {editing && <AccountEditModal account={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function AccountEditModal({ account, onClose }: { account: UserAccount; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { adminUpdateAccount, adminSetAccountStatus, adminApproveClub, adminRejectClub } = useSportsConnect();

  const [fullName, setFullName] = useState(account.fullName ?? "");
  const [playerName, setPlayerName] = useState(account.playerName ?? "");
  const [parentGuardianName, setParentGuardianName] = useState(account.parentGuardianName ?? "");
  const [clubName, setClubName] = useState(account.clubName ?? "");
  const [email, setEmail] = useState(account.email);
  const [mobile, setMobile] = useState(account.mobile ?? "");
  const [location, setLocation] = useState(account.location ?? "");
  const [gender, setGender] = useState(account.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(account.dateOfBirth ?? "");
  const [defaultSport, setDefaultSport] = useState(account.defaultSport ?? "");
  const [sports, setSports] = useState(account.sports.join(", ") ?? "");
  const [clubWebsite, setClubWebsite] = useState(account.clubWebsite ?? "");
  const [clubAddress, setClubAddress] = useState(account.clubAddress ?? "");
  const [clubContactEmail, setClubContactEmail] = useState(account.clubContactEmail ?? "");
  const [clubContactMobile, setClubContactMobile] = useState(account.clubContactMobile ?? "");
  const [bio, setBio] = useState(account.bio ?? "");
  const [instagram, setInstagram] = useState(account.socialLinks.instagram ?? "");
  const [facebook, setFacebook] = useState(account.socialLinks.facebook ?? "");
  const [x, setX] = useState(account.socialLinks.x ?? "");
  const [tiktok, setTiktok] = useState(account.socialLinks.tiktok ?? "");
  const [highlightReelUrl, setHighlightReelUrl] = useState(account.highlightReelUrl ?? "");

  const status = account.status ?? "active";
  const clubApproval = account.role === "club" ? (account.clubApprovalStatus ?? "pending") : null;

  const save = () => {
    adminUpdateAccount(account.id, {
      fullName: fullName.trim() || undefined,
      playerName: playerName.trim() || undefined,
      parentGuardianName: parentGuardianName.trim() || undefined,
      clubName: clubName.trim() || undefined,
      email: email.trim(),
      mobile: mobile.trim() || undefined,
      location: location.trim() || undefined,
      gender: gender.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      defaultSport: defaultSport.trim() || undefined,
      sports: sports.split(",").map((s) => s.trim()).filter(Boolean),
      clubWebsite: clubWebsite.trim() || undefined,
      clubAddress: clubAddress.trim() || undefined,
      clubContactEmail: clubContactEmail.trim() || undefined,
      clubContactMobile: clubContactMobile.trim() || undefined,
      bio: bio.trim() || undefined,
      socialLinks: { instagram: instagram.trim(), facebook: facebook.trim(), x: x.trim(), tiktok: tiktok.trim() },
      highlightReelUrl: highlightReelUrl.trim() || undefined,
    });
    Alert.alert("Account updated", "Changes have been saved.");
    onClose();
  };

  const confirmClose = () => {
    Alert.alert("Close account?", "This account will no longer be able to sign in. You can reactivate later.", [
      { text: "Cancel", style: "cancel" },
      { text: "Close account", style: "destructive", onPress: () => { adminSetAccountStatus(account.id, "closed", "Closed by admin"); onClose(); } },
    ]);
  };

  const confirmBan = () => {
    Alert.alert("Ban account?", `This will close the account and ban the email ${account.email} from being used for new signups.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Ban account & email", style: "destructive", onPress: () => { adminSetAccountStatus(account.id, "banned", "Banned by admin"); onClose(); } },
    ]);
  };

  const reactivate = () => {
    adminSetAccountStatus(account.id, "active", "Reactivated by admin");
    Alert.alert("Account reactivated", "The account (and its email, if previously banned) can be used again.");
    onClose();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.shell, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
            <Feather name={roleIcons[account.role]} size={14} color={colors.primaryForeground} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>{roleLabels[account.role]} account</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>Status: {status}{clubApproval ? ` · ${clubApproval === "approved" ? "Approved" : clubApproval === "rejected" ? "Rejected" : "Waiting Approval"}` : ""}</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Basic info</Text>
          {account.role === "club" ? (
            <>
              <Field label="Club name" value={clubName} onChangeText={setClubName} />
              <Field label="Club website" value={clubWebsite} onChangeText={setClubWebsite} autoCapitalize="none" />
              <Field label="Club address" value={clubAddress} onChangeText={setClubAddress} />
              <Field label="Club contact email" value={clubContactEmail} onChangeText={setClubContactEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Club contact mobile" value={clubContactMobile} onChangeText={setClubContactMobile} />
            </>
          ) : (
            <>
              {account.role === "guardian" ? (
                <Field label="Parent / guardian name" value={parentGuardianName} onChangeText={setParentGuardianName} />
              ) : null}
              <Field label="Full name" value={fullName} onChangeText={setFullName} />
              {account.role === "guardian" || account.role === "player" ? (
                <Field label="Player name" value={playerName} onChangeText={setPlayerName} />
              ) : null}
              <Field label="Gender" value={gender} onChangeText={setGender} />
              <Field label="Date of birth (DD-MM-YYYY)" value={dateOfBirth} onChangeText={setDateOfBirth} />
              <Field label="Bio" value={bio} onChangeText={setBio} multiline />
            </>
          )}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Mobile" value={mobile} onChangeText={setMobile} />
          <Field label="Location" value={location} onChangeText={setLocation} />
          <Field label="Default sport" value={defaultSport} onChangeText={setDefaultSport} />
          <Field label="Sports (comma-separated)" value={sports} onChangeText={setSports} />

          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Social & extras</Text>
          <Field label="Instagram" value={instagram} onChangeText={setInstagram} autoCapitalize="none" />
          <Field label="Facebook" value={facebook} onChangeText={setFacebook} autoCapitalize="none" />
          <Field label="X / Twitter" value={x} onChangeText={setX} autoCapitalize="none" />
          <Field label="TikTok" value={tiktok} onChangeText={setTiktok} autoCapitalize="none" />
          <Field label="Highlight reel URL" value={highlightReelUrl} onChangeText={setHighlightReelUrl} autoCapitalize="none" />

          <PrimaryButton label="Save changes" icon="check" onPress={save} />

          {account.role === "club" && (
            <View style={styles.dangerZone}>
              <Text style={[styles.dangerTitle, { color: colors.foreground }]}>Club approval</Text>
              <Text style={[styles.dangerText, { color: colors.mutedForeground }]}>
                Unapproved clubs cannot post adverts, browse listings, or use messaging.{clubApproval !== "approved" ? " This club is currently awaiting admin approval." : ""}
              </Text>
              <View style={styles.actionRow}>
                {clubApproval !== "approved" && (
                  <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => {
                    Alert.alert("Approve Club", `Approve "${account.clubName ?? account.email}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Approve", onPress: () => { adminApproveClub(account.id); onClose(); } },
                    ]);
                  }} />
                )}
                {clubApproval !== "rejected" && (
                  <ActionButton icon="x" label="Reject" color="#EF4444" onPress={() => {
                    Alert.alert("Reject Club", `Reject "${account.clubName ?? account.email}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Reject", style: "destructive", onPress: () => { adminRejectClub(account.id); onClose(); } },
                    ]);
                  }} />
                )}
                {clubApproval === "rejected" && (
                  <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => {
                    Alert.alert("Approve Club", `Approve "${account.clubName ?? account.email}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Approve", onPress: () => { adminApproveClub(account.id); onClose(); } },
                    ]);
                  }} />
                )}
              </View>
            </View>
          )}

          <View style={styles.dangerZone}>
            <Text style={[styles.dangerTitle, { color: colors.foreground }]}>Account status</Text>
            <Text style={[styles.dangerText, { color: colors.mutedForeground }]}>
              Closing prevents sign-in. Banning also blocks this email from creating any new account. Both can be reversed.
            </Text>
            <View style={styles.actionRow}>
              {status === "active" ? (
                <>
                  <ActionButton icon="x-circle" label="Close" color="#F59E0B" onPress={confirmClose} />
                  <ActionButton icon="user-x" label="Ban" color="#EF4444" onPress={confirmBan} />
                </>
              ) : (
                <ActionButton icon="rotate-ccw" label="Reactivate" color="#10B981" onPress={reactivate} />
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ModerationSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profileImages, pendingHighlightLinks, pendingSportRequests, moderateImage, moderateHighlightLink, moderateSportRequest, getImageUri, accounts } = useSportsConnect();
  const pendingImages = profileImages.filter((i) => i.status === "pending");
  const pendingHighlights = pendingHighlightLinks.filter((l) => l.status === "pending");
  const pendingSports = pendingSportRequests.filter((r) => r.status === "pending");
  const [fullSizeUri, setFullSizeUri] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
      <Modal transparent visible={!!fullSizeUri} animationType="fade" onRequestClose={() => setFullSizeUri(null)}>
        <Pressable onPress={() => setFullSizeUri(null)} style={styles.scrim}>
          <View style={styles.fullSizeWrap}>
            {fullSizeUri && <Image source={{ uri: fullSizeUri }} style={styles.fullSizeImage} contentFit="contain" />}
          </View>
        </Pressable>
      </Modal>

      <SectionTitle title="Profile images" action={`${pendingImages.length} pending`} />
      {pendingImages.length === 0 ? (
        <EmptyState icon="image" title="No images to review" text="Pending profile image submissions will appear here." />
      ) : pendingImages.map((img) => {
        const uri = getImageUri(img.id, true);
        const account = accounts.find((a) => a.profileImageId === img.id);
        return (
          <View key={img.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
              <Pressable onPress={() => { if (account) Alert.alert(account.role === "club" ? account.clubName || "Club" : account.fullName || account.playerName || "Player", `Role: ${account.role}\nEmail: ${account.email}\nStatus: ${account.status}`); }} style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{img.owner}</Text>
              </Pressable>
              <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.badgeText, { color: "#92400E" }]}>Pending</Text>
              </View>
            </View>
            {uri ? (
              <Pressable onPress={() => setFullSizeUri(uri)} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                <View style={styles.thumbOverlay}>
                  <Feather name="maximize-2" size={16} color="#FFF" />
                </View>
              </Pressable>
            ) : (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>(no preview)</Text>
            )}
            {account ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                Previous declines: {account.profileImageDeclines ?? 0}
              </Text>
            ) : (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                Account not linked — image may be orphaned
              </Text>
            )}
            <View style={styles.actionRow}>
              <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => moderateImage(img.id, "approved")} />
              <ActionButton icon="x" label="Reject" color="#EF4444" onPress={() => moderateImage(img.id, "rejected")} />
            </View>
          </View>
        );
      })}

      <SectionTitle title="Highlight reels" action={`${pendingHighlights.length} pending`} />
      {pendingHighlights.length === 0 ? (
        <EmptyState icon="video" title="No highlight reels to review" text="Submitted highlight links will appear here." />
      ) : pendingHighlights.map((link) => (
        <View key={link.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{link.owner}</Text>
            <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.badgeText, { color: "#92400E" }]}>Pending</Text>
            </View>
          </View>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{link.url}</Text>
          <View style={styles.actionRow}>
            <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => moderateHighlightLink(link.id, "approved")} />
            <ActionButton icon="x" label="Reject" color="#EF4444" onPress={() => moderateHighlightLink(link.id, "rejected")} />
          </View>
        </View>
      ))}

      <SectionTitle title="Sport requests" action={`${pendingSports.length} pending`} />
      {pendingSports.length === 0 ? (
        <EmptyState icon="plus-circle" title="No sport requests" text="New sport suggestions will appear here for review." />
      ) : pendingSports.map((req) => (
        <View key={req.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{req.name}</Text>
            <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.badgeText, { color: "#92400E" }]}>Pending</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => moderateSportRequest(req.id, "approved")} />
            <ActionButton icon="x" label="Reject" color="#EF4444" onPress={() => moderateSportRequest(req.id, "rejected")} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ClubApprovalsSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, adminApproveClub, adminRejectClub } = useSportsConnect();

  const clubApprovalBadge = (status?: ClubApprovalStatus) => {
    if (status === "approved") return { bg: "#D1FAE5", fg: "#065F46", label: "Approved" };
    if (status === "rejected") return { bg: "#FEE2E2", fg: "#991B1B", label: "Rejected" };
    return { bg: "#FEF3C7", fg: "#92400E", label: "Pending" };
  };

  const clubs = accounts
    .filter((a) => a.role === "club")
    .sort((a, b) => {
      const order = { pending: 0, rejected: 1, approved: 2 };
      const sa = order[a.clubApprovalStatus ?? "pending"] ?? 0;
      const sb = order[b.clubApprovalStatus ?? "pending"] ?? 0;
      if (sa !== sb) return sa - sb;
      return b.createdAt > a.createdAt ? 1 : -1;
    });

  const confirmApprove = (acc: UserAccount) => {
    Alert.alert(
      "Approve Club",
      `Approve "${acc.clubName ?? acc.email}"? They will gain full access to post adverts and use messaging.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => adminApproveClub(acc.id) },
      ]
    );
  };

  const confirmReject = (acc: UserAccount) => {
    Alert.alert(
      "Reject Club",
      `Reject "${acc.clubName ?? acc.email}"? Their account will remain but they cannot access the app.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => adminRejectClub(acc.id) },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
      <SectionTitle title="Club Approvals" action={`${clubs.filter((c) => !c.clubApprovalStatus || c.clubApprovalStatus === "pending").length} pending`} />
      <Text style={[styles.helperText, { color: colors.mutedForeground, marginBottom: 12 }]}>
        All new club accounts require admin approval before they can post adverts, view listings, or use messaging. Approvals are also reset when a club edits their profile.
      </Text>

      {clubs.length === 0 ? (
        <EmptyState icon="shield" title="No club accounts" text="Club accounts will appear here for approval." />
      ) : (
        clubs.map((acc) => {
          const badge = clubApprovalBadge(acc.clubApprovalStatus);
          const isPending = !acc.clubApprovalStatus || acc.clubApprovalStatus === "pending";
          return (
            <View key={acc.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: isPending ? "#FDE68A" : colors.border, borderWidth: isPending ? 1.5 : 1 }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {acc.clubName ?? acc.email}
                </Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Feather name="mail" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{acc.email}</Text>
              </View>
              {acc.location ? (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{acc.location}</Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Feather name="activity" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Sport: {acc.defaultSport}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Registered: {acc.createdAt.slice(0, 10)}</Text>
              </View>
              <View style={styles.actionRow}>
                <ActionButton icon="check" label="Approve" color="#10B981" onPress={() => confirmApprove(acc)} />
                <ActionButton icon="x" label="Reject" color="#EF4444" onPress={() => confirmReject(acc)} />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function SettingsSection({ onClose }: { onClose?: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { changeAdminPasscode, adminSignOut, bannedEmails, adminUnbanEmail, clearAllData } = useSportsConnect();
  const [showPass, setShowPass] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const save = () => {
    const ok = changeAdminPasscode(current, next);
    if (ok) {
      Alert.alert("Passcode updated", "Your new admin passcode has been saved.");
      setShowPass(false);
      setCurrent("");
      setNext("");
    } else {
      Alert.alert("Incorrect passcode", "Please check your current passcode and try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
      <SectionTitle title="Banned emails" action={`${bannedEmails.length}`} />
      {bannedEmails.length === 0 ? (
        <EmptyState icon="check-circle" title="No banned emails" text="Emails you ban from the Accounts section will appear here." />
      ) : bannedEmails.map((email) => (
        <View key={email} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{email}</Text>
            <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
              <Text style={[styles.badgeText, { color: "#991B1B" }]}>Banned</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <ActionButton icon="rotate-ccw" label="Unban email" color="#10B981" onPress={() => {
              Alert.alert("Unban email?", `Allow ${email} to create or use accounts again?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Unban", onPress: () => adminUnbanEmail(email) },
              ]);
            }} />
          </View>
        </View>
      ))}

      <SectionTitle title="Admin passcode" />
      <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {showPass ? (
          <>
            <Field label="Current passcode" value={current} onChangeText={setCurrent} secureTextEntry />
            <Field label="New passcode" value={next} onChangeText={setNext} secureTextEntry />
            <View style={styles.actionRow}>
              <ActionButton icon="x" label="Cancel" color={colors.mutedForeground} onPress={() => { setShowPass(false); setCurrent(""); setNext(""); }} />
              <ActionButton icon="check" label="Save passcode" color={colors.primary} onPress={save} />
            </View>
          </>
        ) : (
          <ActionButton icon="key" label="Change passcode" color={colors.primary} onPress={() => setShowPass(true)} />
        )}
      </View>

      <SectionTitle title="Danger zone" />
      <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Wipe all database data and clear local storage. This cannot be undone.</Text>
        <View style={styles.actionRow}>
          <ActionButton icon="trash-2" label="Wipe all data" color="#EF4444" onPress={() => {
            Alert.alert("Wipe everything?", "This deletes all database records, local cache, and resets the app to a clean state. It cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Wipe all data", style: "destructive", onPress: () => { clearAllData(); onClose?.(); } },
            ]);
          }} />
        </View>
      </View>

      <SectionTitle title="Admin session" />
      <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Sign out of admin to return to standard app permissions.</Text>
        <View style={styles.actionRow}>
          <ActionButton icon="log-out" label="Sign out of admin" color="#EF4444" onPress={() => { adminSignOut(); onClose?.(); }} />
        </View>
      </View>
    </ScrollView>
  );
}

function ActionButton({ icon, label, color, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: color, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Feather name={icon} size={15} color="#FFF" />
      <Text style={styles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  adminBadgeText: { fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },
  headerCopy: { flex: 1 },
  title: { fontWeight: "800", fontSize: 22, letterSpacing: -0.5 },
  subtitle: { fontWeight: "500", fontSize: 13, marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tabsRow: { gap: 8, paddingHorizontal: 18, paddingVertical: 14 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  tabLabel: { fontWeight: "700", fontSize: 13 },
  body: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 6, gap: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  statCard: { width: "31%", flexGrow: 1, minWidth: 100, borderWidth: 1, borderRadius: 18, padding: 14, gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontWeight: "800", fontSize: 22, letterSpacing: -0.5 },
  statLabel: { fontWeight: "600", fontSize: 12 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  itemCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemTitle: { fontWeight: "700", fontSize: 15, flex: 1 },
  itemBody: { fontWeight: "500", fontSize: 13, lineHeight: 19, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontWeight: "500", fontSize: 12, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontWeight: "700", fontSize: 11, letterSpacing: 0.3 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  actionBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  helperText: { fontWeight: "500", fontSize: 13, lineHeight: 19 },
  thumbWrap: { width: 120, height: 120, borderRadius: 14, overflow: "hidden", alignSelf: "flex-start", position: "relative" },
  thumb: { width: "100%", height: "100%" },
  thumbOverlay: { position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, padding: 4 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  fullSizeWrap: { width: "100%", aspectRatio: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" },
  fullSizeImage: { width: "100%", height: "100%" },
  dangerZone: { marginTop: 18, gap: 8 },
  dangerTitle: { fontWeight: "700", fontSize: 16 },
  dangerText: { fontWeight: "500", fontSize: 13, lineHeight: 19 },
  sectionHeader: { fontWeight: "700", fontSize: 14, marginTop: 20, marginBottom: 8, letterSpacing: 0.2, textTransform: "uppercase" as const },
});
