import { Feather } from "@expo/vector-icons";
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
import { useColors } from "@/hooks/useColors";

type Section = "overview" | "adverts" | "chats" | "accounts" | "moderation" | "settings";

const sections: { key: Section; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "adverts", label: "Adverts", icon: "clipboard" },
  { key: "chats", label: "Chats", icon: "message-circle" },
  { key: "accounts", label: "Accounts", icon: "users" },
  { key: "moderation", label: "Moderation", icon: "shield" },
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

export function AdminDashboard({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("overview");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </Pressable>
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
          {section === "settings" && <SettingsSection onClose={onClose} />}
        </View>
      </View>
    </Modal>
  );
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
      </View>
    </ScrollView>
  );
}

function AdvertsSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { adverts, accounts, adminSetAdvertStatus, updateAdvert } = useSportsConnect();
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
                {advert.description ? (
                  <Text style={[styles.itemBody, { color: colors.foreground }]} numberOfLines={3}>{advert.description}</Text>
                ) : null}
                <View style={styles.actionRow}>
                  <ActionButton icon="edit-2" label="Edit" color={colors.primary} onPress={() => setEditing(advert)} />
                  {isClosed ? (
                    <ActionButton icon="rotate-ccw" label="Reopen" color="#10B981" onPress={() => adminSetAdvertStatus(advert.id, "active")} />
                  ) : (
                    <ActionButton icon="x-circle" label="Close" color="#EF4444" onPress={() => {
                      Alert.alert("Close advert?", "This will hide the advert from the public feed. You can reopen it later.", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Close advert", style: "destructive", onPress: () => adminSetAdvertStatus(advert.id, "closed", "Closed by admin") },
                      ]);
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
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Description" value={description} onChangeText={setDescription} multiline />
          <Field label="Location" value={location} onChangeText={setLocation} />
          <Field label="Level" value={level} onChangeText={setLevel} />
          <Field label="Availability" value={availability} onChangeText={setAvailability} />
          <Field label="Needs / requirements" value={needs} onChangeText={setNeeds} multiline />
          <PrimaryButton label="Save changes" icon="check" onPress={() => onSave({ title, description, location, level, availability, needs })} />
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
      {opened && <ChatRoom conversation={opened} onClose={() => setOpenedId(null)} asAdmin />}
    </>
  );
}

function AccountsSection() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, bannedEmails } = useSportsConnect();
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
            return (
              <Pressable
                key={acc.id}
                onPress={() => setEditing(acc)}
                style={({ pressed }) => [styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{displayName(acc)}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{status[0].toUpperCase() + status.slice(1)}</Text>
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
  const { adminUpdateAccount, adminSetAccountStatus } = useSportsConnect();
  const [fullName, setFullName] = useState(account.fullName ?? "");
  const [playerName, setPlayerName] = useState(account.playerName ?? "");
  const [parentGuardianName, setParentGuardianName] = useState(account.parentGuardianName ?? "");
  const [clubName, setClubName] = useState(account.clubName ?? "");
  const [email, setEmail] = useState(account.email);
  const [mobile, setMobile] = useState(account.mobile ?? "");
  const [location, setLocation] = useState(account.location ?? "");
  const status = account.status ?? "active";

  const save = () => {
    adminUpdateAccount(account.id, {
      fullName: fullName.trim() || undefined,
      playerName: playerName.trim() || undefined,
      parentGuardianName: parentGuardianName.trim() || undefined,
      clubName: clubName.trim() || undefined,
      email: email.trim(),
      mobile: mobile.trim() || undefined,
      location: location.trim() || undefined,
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
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>Status: {status}</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          {account.role === "club" ? (
            <Field label="Club name" value={clubName} onChangeText={setClubName} />
          ) : (
            <>
              {account.role === "guardian" ? (
                <Field label="Parent / guardian name" value={parentGuardianName} onChangeText={setParentGuardianName} />
              ) : null}
              <Field label="Full name" value={fullName} onChangeText={setFullName} />
              <Field label="Player name" value={playerName} onChangeText={setPlayerName} />
            </>
          )}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Mobile" value={mobile} onChangeText={setMobile} />
          <Field label="Location" value={location} onChangeText={setLocation} />

          <PrimaryButton label="Save changes" icon="check" onPress={save} />

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
  const { profileImages, pendingHighlightLinks, pendingSportRequests, moderateImage, moderateHighlightLink, moderateSportRequest, getImageUri } = useSportsConnect();
  const pendingImages = profileImages.filter((i) => i.status === "pending");
  const pendingHighlights = pendingHighlightLinks.filter((l) => l.status === "pending");
  const pendingSports = pendingSportRequests.filter((r) => r.status === "pending");

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
      <SectionTitle title="Profile images" action={`${pendingImages.length} pending`} />
      {pendingImages.length === 0 ? (
        <EmptyState icon="image" title="No images to review" text="Pending profile image submissions will appear here." />
      ) : pendingImages.map((img) => {
        const uri = getImageUri(img.id, true);
        return (
          <View key={img.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{img.owner}</Text>
              <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.badgeText, { color: "#92400E" }]}>Pending</Text>
              </View>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{uri ?? "(no preview)"}</Text>
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

function SettingsSection({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { changeAdminPasscode, adminSignOut, bannedEmails, adminUnbanEmail } = useSportsConnect();
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

      <SectionTitle title="Admin session" />
      <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Sign out of admin to return to standard app permissions.</Text>
        <View style={styles.actionRow}>
          <ActionButton icon="log-out" label="Sign out of admin" color="#EF4444" onPress={() => { adminSignOut(); onClose(); }} />
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
  dangerZone: { marginTop: 18, gap: 8 },
  dangerTitle: { fontWeight: "700", fontSize: 16 },
  dangerText: { fontWeight: "500", fontSize: 13, lineHeight: 19 },
});
