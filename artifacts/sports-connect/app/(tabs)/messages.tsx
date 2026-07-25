import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { COACH_EXPERIENCE_LEVELS } from "@/constants/coachLevels";
import { containsProfanity } from "@/utils/profanityFilter";
import { COACH_SUB_ROLES, coachSubRoleLabel } from "@/constants/coachSubRoles";
import { getClubLabel } from "@/constants/clubLabel";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, ScreenShell } from "@/components/SportsUI";
import { Conversation, UserAccount, useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";
import { openMapApp } from "@/utils/mapLinks";

const PAGE_SIZE = 6;
const BOX_GAP = 12;

function AvatarCircle({ label, color, size = 36 }: { label: string; color: string; size?: number }) {
  const initials = label
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[avatarStyles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[avatarStyles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  initials: { color: "#FFFFFF", fontWeight: "800" },
});

function anonymousLabel(
  conversation: Conversation,
  accounts: UserAccount[],
  currentAccountId?: string,
): { title: string; subtitle: string } {
  const isAnonymous = conversation.status === "pending" || conversation.status === "denied";
  const isInitiator = currentAccountId === conversation.initiatorAccountId;
  const isOwner = currentAccountId === conversation.ownerAccountId;

  const guardianLabel = () => {
    const initAcc = accounts.find((a) => a.id === conversation.initiatorAccountId);
    if (initAcc?.role === "guardian" && initAcc.parentGuardianName) {
      return `Parent/Guardian ${initAcc.parentGuardianName} on behalf of ${initAcc.playerName ?? "a player"}`;
    }
    return null;
  };

  if (!isAnonymous) {
    if (isOwner && conversation.requesterType === "guardian") {
      const gLabel = guardianLabel();
      if (gLabel) {
        return { title: gLabel, subtitle: `${conversation.sport ?? ""} · ${conversation.requesterLocation ?? ""}` };
      }
    }
    return { title: conversation.clubName, subtitle: `${conversation.sport ?? ""} · ${conversation.playerName}` };
  }

  if (isInitiator) {
    const ownerAccount = accounts.find((a) => a.id === conversation.ownerAccountId);
    const ownerLabel = conversation.advertPostedByType === "club"
      ? (ownerAccount?.clubType === "academy" ? "An Academy" : "A Club")
      : conversation.advertPostedByType === "coach"
        ? `A ${coachSubRoleLabel(conversation.advertOwnerCoachSubRole)}`
        : "A Player";
    return { title: `${ownerLabel} (${conversation.advertLocation ?? "Unknown location"})`, subtitle: conversation.sport ?? "" };
  }
  if (isOwner) {
    const gLabel = guardianLabel();
    if (gLabel) {
      return { title: gLabel, subtitle: `${conversation.requesterLocation ?? ""} · ${conversation.sport ?? ""}` };
    }
    const initiatorAccount = accounts.find((a) => a.id === conversation.initiatorAccountId);
    const requesterLabel = conversation.requesterType === "club"
      ? (initiatorAccount?.clubType === "academy" ? "An Academy" : "A Club")
      : conversation.requesterType === "coach"
        ? `A ${coachSubRoleLabel(conversation.requesterCoachSubRole)}`
        : "A Player";
    return { title: `${requesterLabel} (${conversation.requesterLocation ?? "Unknown location"})`, subtitle: conversation.sport ?? "" };
  }
  return { title: conversation.clubName, subtitle: `${conversation.sport ?? ""} · ${conversation.playerName}` };
}

function ChatBox({ conversation, onPress, boxWidth, currentAccountId }: { conversation: Conversation; onPress: () => void; boxWidth: number; currentAccountId?: string }) {
  const colors = useColors();
  const { accounts } = useSportsConnect();
  const isPending = conversation.status === "pending";
  const isDenied = conversation.status === "denied";
  const isUserClosed = conversation.status === "closed" && !!conversation.closedByName && !conversation.closedByAdmin;
  const isUnread = !isPending && !isDenied && !isUserClosed && conversation.status !== "closed" && conversation.hasUnread;

  const borderColor = isDenied || isUserClosed ? colors.border : isPending ? "#F59E0B" : isUnread ? "#EF4444" : colors.border;
  const bgColor = isDenied || isUserClosed ? colors.muted : isPending ? "rgba(245,158,11,0.12)" : isUnread ? "rgba(239,68,68,0.10)" : colors.card;
  const badgeColor = isPending ? "#F59E0B" : isUnread ? "#EF4444" : "transparent";

  const lastMsg = conversation.messages[0];
  const { title, subtitle } = anonymousLabel(conversation, accounts, currentAccountId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatBox,
        { width: boxWidth, backgroundColor: bgColor, borderColor, opacity: pressed ? 0.80 : 1 },
      ]}
    >
      {(isPending || isUnread) && (
        <View style={[styles.statusBar, { backgroundColor: badgeColor }]} />
      )}

      <View style={[styles.chatBoxInner, (isDenied || isUserClosed) ? { opacity: 0.55 } : null]}>
        {isPending ? (
          <View style={styles.pendingIconWrap}>
            <View style={[styles.pendingIcon, { backgroundColor: "#F59E0B22" }]}>
              <Feather name="bell" size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.chatBoxStatus, { color: "#F59E0B" }]}>Awaiting response</Text>
          </View>
        ) : isDenied ? (
          <View style={styles.pendingIconWrap}>
            <View style={[styles.pendingIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="x-circle" size={22} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.chatBoxStatus, { color: colors.mutedForeground }]}>Not agreed</Text>
          </View>
        ) : isUserClosed ? (
          <View style={styles.pendingIconWrap}>
            <View style={[styles.pendingIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="minus-circle" size={22} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.chatBoxStatus, { color: colors.mutedForeground }]} numberOfLines={1}>
              Chat closed by {conversation.closedByName ?? "other party"}
            </Text>
          </View>
        ) : (
          <View style={styles.avatarsRow}>
            <AvatarCircle label={conversation.clubName} color={isUnread ? "#EF4444" : colors.primary} size={38} />
            <AvatarCircle label={conversation.playerName} color={colors.mutedForeground} size={32} />
          </View>
        )}

        <Text style={[styles.chatBoxName, { color: colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={[styles.chatBoxSport, { color: isPending ? "#F59E0B" : isDenied ? colors.mutedForeground : isUnread ? "#EF4444" : colors.primary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : conversation.sport ? (
          <Text style={[styles.chatBoxSport, { color: isPending ? "#F59E0B" : isDenied ? colors.mutedForeground : isUnread ? "#EF4444" : colors.primary }]} numberOfLines={1}>
            {conversation.sport}
          </Text>
        ) : null}

        {lastMsg ? (
          <Text style={[styles.chatBoxPreview, { color: isPending ? "#F59E0B" : colors.mutedForeground }]} numberOfLines={2}>
            {lastMsg.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function MessageSender({ accountId, isMe }: { accountId?: string; isMe: boolean }) {
  const colors = useColors();
  const { accounts, currentAccount, getImageUri } = useSportsConnect();
  const account = isMe ? currentAccount : accounts.find((a) => a.id === accountId);
  const name = isMe
    ? (account?.clubName || account?.fullName || account?.parentGuardianName || account?.playerName || "You")
    : (account?.clubName || account?.fullName || account?.parentGuardianName || account?.playerName || "User");
  const uri = getImageUri(account?.profileImageId);
  return (
    <View style={[styles.senderRow, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.senderAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.senderAvatar, { backgroundColor: isMe ? colors.primary : colors.mutedForeground, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 10 }}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={[styles.senderName, { color: colors.foreground }]}>{name}</Text>
    </View>
  );
}

type ProfileRowColors = { muted: string; border: string; foreground: string; primary: string; mutedForeground: string };

function ProfileRow({ icon, label, tappable, colors }: { icon: keyof typeof Feather.glyphMap; label: string; tappable?: boolean; colors: ProfileRowColors }) {
  return (
    <View style={[profileStyles.row, { backgroundColor: colors.muted, borderColor: colors.foreground, borderWidth: 2 }]}>
      <Feather name={icon} size={14} color={tappable ? colors.primary : colors.mutedForeground} />
      <Text style={[profileStyles.rowText, { color: tappable ? colors.primary : colors.foreground }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function ProfileViewModal({
  account,
  onClose,
  enlargedImage,
  onSetEnlargedImage,
}: {
  account: UserAccount | null;
  onClose: () => void;
  enlargedImage: string | null;
  onSetEnlargedImage: (uri: string | null) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getImageUri, currentAccount, createReport } = useSportsConnect();

  if (!account) return null;

  const isClub = account.role === "club";
  const isCoach = account.role === "coach";
  const isGuardian = account.role === "guardian";
  const isPremium = account.subscriptionStatus === "active";
  const socialLinks = account.socialLinks ?? { instagram: "", facebook: "", x: "", tiktok: "" };

  const displayName = isClub ? (account.clubName ?? getClubLabel(account)) : isGuardian ? (account.parentGuardianName ?? "Guardian") : (account.fullName ?? "User");
  const roleLabel = isClub ? getClubLabel(account) : isCoach ? coachSubRoleLabel(account.coachSubRole) : isGuardian ? "Parent/Guardian" : "Player";
  const avatarColor = isClub ? "#16A34A" : isCoach ? "#7C3AED" : "#2563EB";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const imageUri = getImageUri(account.profileImageId);

  const handleLink = async (raw: string) => {
    if (!raw) return;
    const url = raw.startsWith("http") || raw.startsWith("mailto:") ? raw : `https://${raw}`;
    try { await Linking.openURL(url); } catch { /* ignore */ }
  };

  const address = isClub ? account.clubAddress : account.location;
  const addressQuery = address ? `${displayName} ${address}`.trim() : address;

  return (
    <>
      {/* Enlarged image viewer */}
      <Modal visible={!!enlargedImage} animationType="fade" transparent onRequestClose={() => onSetEnlargedImage(null)}>
        <View style={profileStyles.overlay}>
          <Pressable style={profileStyles.overlayBg} onPress={() => onSetEnlargedImage(null)} />
          <View style={profileStyles.enlargedWrap}>
            <Pressable onPress={() => onSetEnlargedImage(null)} style={profileStyles.enlargedClose}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
            {enlargedImage ? (
              <Image source={{ uri: enlargedImage }} style={profileStyles.enlargedImg} contentFit="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Profile sheet */}
      <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={profileStyles.overlay}>
          <Pressable style={profileStyles.overlayBg} onPress={onClose} />
          <View style={[profileStyles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <Pressable onPress={onClose} style={[profileStyles.closeBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={profileStyles.sheetContent}>
              <View style={profileStyles.profileHead}>
                <Pressable onPress={() => imageUri ? onSetEnlargedImage(imageUri) : undefined}>
                  <View style={[profileStyles.avatarCircle, { backgroundColor: avatarColor + "22" }]}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={profileStyles.avatarImg} contentFit="cover" />
                    ) : (
                      <Text style={[profileStyles.avatarInitials, { color: avatarColor }]}>{initials}</Text>
                    )}
                    {isPremium ? (
                      <View style={profileStyles.premiumBadge}>
                        <Feather name="star" size={12} color="#D97706" />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[profileStyles.displayName, { color: colors.foreground }]} numberOfLines={2}>{displayName}</Text>
                  {account.verifiedBadge ? <Feather name="check-circle" size={16} color="#16A34A" /> : null}
                </View>
                <View style={[profileStyles.rolePill, { backgroundColor: colors.secondary }]}>
                  <Text style={[profileStyles.roleText, { color: colors.mutedForeground }]}>{roleLabel}</Text>
                </View>
              </View>

              {account.location ? (
                <Pressable onPress={() => void openMapApp("apple", addressQuery ?? account.location ?? "")}>
                  <ProfileRow icon="map-pin" label={account.location} tappable colors={colors} />
                </Pressable>
              ) : null}
              {isGuardian && account.playerName ? (
                <ProfileRow icon="user" label={`On behalf of: ${account.playerName}`} colors={colors} />
              ) : null}
              {(account.sports?.length ?? 0) > 0 ? <ProfileRow icon="activity" label={account.sports.join(", ")} colors={colors} /> : null}
              {account.bio ? (
                <View style={[profileStyles.bioBox, { backgroundColor: colors.muted }]}>
                  <Text style={[profileStyles.bioText, { color: colors.foreground }]}>{account.bio}</Text>
                </View>
              ) : null}

              {/* Player / Guardian / Coach vetting fields */}
              {!isClub && (
                isCoach ? (
                  <>
                    {account.coachSubRole ? (
                      <ProfileRow
                        icon="briefcase"
                        label={COACH_SUB_ROLES.find((r) => r.value === account.coachSubRole)?.label ?? account.coachSubRole}
                        colors={colors}
                      />
                    ) : null}
                    {account.coachCurrentLevel ? (
                      <ProfileRow
                        icon="award"
                        label={COACH_EXPERIENCE_LEVELS.find((l) => l.value === account.coachCurrentLevel)?.label ?? account.coachCurrentLevel}
                        colors={colors}
                      />
                    ) : null}
                    {account.coachCurrentClub ? <ProfileRow icon="shield" label={account.coachCurrentClub} colors={colors} /> : null}
                  </>
                ) : (
                  <>
                    {(account.playerPositions?.length ?? 0) > 0 ? (
                      <ProfileRow icon="crosshair" label={account.playerPositions!.join(", ")} colors={colors} />
                    ) : null}
                    {account.playerCurrentLevel ? <ProfileRow icon="trending-up" label={account.playerCurrentLevel} colors={colors} /> : null}
                    {account.playerCurrentAgeGroup ? <ProfileRow icon="users" label={account.playerCurrentAgeGroup} colors={colors} /> : null}
                    {account.playerCurrentClub ? <ProfileRow icon="shield" label={account.playerCurrentClub} colors={colors} /> : null}
                  </>
                )
              )}

              {isClub ? (
                <>
                  {account.clubAddress ? (
                    <Pressable onPress={() => void openMapApp("apple", addressQuery ?? account.clubAddress ?? "")}>
                      <ProfileRow icon="home" label={account.clubAddress} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                  {account.clubContactEmail ? (
                    <Pressable onPress={() => void handleLink(`mailto:${account.clubContactEmail!}`)}>
                      <ProfileRow icon="mail" label={account.clubContactEmail!} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                  {account.clubContactMobile ? <ProfileRow icon="phone" label={account.clubContactMobile} colors={colors} /> : null}
                  {account.clubWebsite ? (
                    <Pressable onPress={() => void handleLink(account.clubWebsite!)}>
                      <ProfileRow icon="globe" label={account.clubWebsite!} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                </>
              ) : null}

              {!isClub && isPremium ? (
                <>
                  {socialLinks.instagram ? (
                    <Pressable onPress={() => void handleLink(socialLinks.instagram ?? "")}>
                      <ProfileRow icon="instagram" label={socialLinks.instagram} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                  {socialLinks.facebook ? (
                    <Pressable onPress={() => void handleLink(socialLinks.facebook ?? "")}>
                      <ProfileRow icon="facebook" label={socialLinks.facebook} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                  {socialLinks.x ? (
                    <Pressable onPress={() => void handleLink(socialLinks.x ?? "")}>
                      <ProfileRow icon="twitter" label={socialLinks.x} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                  {socialLinks.tiktok ? (
                    <Pressable onPress={() => void handleLink(socialLinks.tiktok ?? "")}>
                      <ProfileRow icon="music" label={socialLinks.tiktok} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                  {account.highlightReelUrl && account.highlightReelStatus === "approved" ? (
                    <Pressable onPress={() => void handleLink(account.highlightReelUrl!)}>
                      <ProfileRow icon="play-circle" label={account.highlightReelUrl!} tappable colors={colors} />
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              {/* Report button */}
              {currentAccount?.id !== account.id && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Report this account",
                      undefined,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Underage", onPress: () => {
                          Alert.alert(
                            "Report underage user",
                            "This will report the account to admin for review. The account will be paused from messaging until review is complete.",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Report", style: "destructive", onPress: () => createReport(account.id, "I believe this person is underage") },
                            ]
                          );
                        }},
                        { text: "Inappropriate behaviour", onPress: () => createReport(account.id, "Inappropriate behaviour") },
                        { text: "Spam / fake account", onPress: () => createReport(account.id, "Spam / fake account") },
                        { text: "Other", onPress: () => createReport(account.id, "Other") },
                      ]
                    );
                  }}
                  style={({ pressed }) => [
                    profileStyles.reportBtn,
                    { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Feather name="flag" size={14} color="#DC2626" />
                  <Text style={{ color: "#DC2626", fontSize: 14, fontWeight: "600" }}>Report this account</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ConnectedParticipantStrip({
  conversation,
  onViewProfile,
}: {
  conversation: Conversation;
  onViewProfile: (account: UserAccount) => void;
}) {
  const colors = useColors();
  const { accounts, moderators } = useSportsConnect();

  const moderatorIds = new Set(moderators.map((m) => m.id));
  const rawIds = [
    conversation.ownerAccountId,
    conversation.initiatorAccountId,
    ...(conversation.affiliatedClubParticipants ?? []),
  ].filter((id): id is string => !!id && !moderatorIds.has(id));
  const uniqueIds = [...new Set(rawIds)];
  const participants = uniqueIds
    .map((id) => accounts.find((a) => a.id === id))
    .filter((a): a is UserAccount => !!a);

  if (participants.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[participantStyles.strip, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
      contentContainerStyle={participantStyles.stripContent}
    >
      {participants.map((account) => {
        const isClub = account.role === "club";
        const isCoach = account.role === "coach";
        const isGuardian = account.role === "guardian";
        const name = isClub
          ? (account.clubName ?? "Club")
          : isGuardian
          ? (account.parentGuardianName ?? account.fullName ?? account.playerName ?? "Guardian")
          : (account.fullName ?? account.playerName ?? "User");
        const icon = isClub ? "shield" : isCoach ? "award" : isGuardian ? "users" : "user";
        const iconColor = isClub ? "#16A34A" : isCoach ? "#7C3AED" : isGuardian ? "#2563EB" : "#2563EB";
        return (
          <View key={account.id} style={[participantStyles.tile, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
            <View style={[participantStyles.iconCircle, { backgroundColor: iconColor + "22" }]}>
              <Feather name={icon as any} size={16} color={iconColor} />
            </View>
            <View style={participantStyles.tileText}>
              <Text style={[participantStyles.name, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
              <Pressable onPress={() => onViewProfile(account)}>
                <Text style={[participantStyles.viewLink, { color: colors.primary }]}>View Profile</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function ChatRoom({ conversationId, onClose, asAdmin }: { conversationId: string; onClose: () => void; asAdmin?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, sendMessage, broadcastMessage, adminSendMessage, markConversationRead, closeConversation, currentAccount, accounts, isAdmin, createReport } = useSportsConnect();
  const conversation = conversations.find((c) => c.id === conversationId)!;
  const [draft, setDraft] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<UserAccount | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const adminMode = !!asAdmin && isAdmin;
  const { title: roomTitle, subtitle: roomSubtitle } = anonymousLabel(conversation, accounts, currentAccount?.id);

  const connectedSiblings = conversations.filter(
    (c) => c.advertId === conversation.advertId && c.status === "connected"
  );
  const isAffiliatedCoach = currentAccount?.role === "coach" && !!currentAccount?.affiliatedClubId;
  const canBroadcast =
    ((currentAccount?.role === "club" && currentAccount?.id === conversation.ownerAccountId) ||
     (isAffiliatedCoach && conversation.affiliatedClubParticipants?.includes(currentAccount?.id))) &&
    connectedSiblings.length >= 2;

  useEffect(() => {
    markConversationRead(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (adminMode) {
      adminSendMessage(conversationId, trimmed);
      setDraft("");
      return;
    }
    if (containsProfanity(trimmed)) {
      Alert.alert("Inappropriate language", "Please remove inappropriate language from your message before sending.");
      return;
    }
    if (isBroadcast && canBroadcast) {
      const count = connectedSiblings.length;
      const advertTitle = conversation.advertTitle ?? "this advert";
      Alert.alert(
        "Broadcast Message",
        `Send to all ${count} connected chats for "${advertTitle}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send to All",
            onPress: () => {
              broadcastMessage(conversation.advertId, trimmed);
              setDraft("");
              setIsBroadcast(false);
            },
          },
        ]
      );
      return;
    }
    sendMessage(conversationId, trimmed);
    setDraft("");
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ProfileViewModal account={viewingProfile} onClose={() => setViewingProfile(null)} enlargedImage={enlargedImage} onSetEnlargedImage={setEnlargedImage} />
      <View style={[styles.chatRoomWrap, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={0}>
          <View style={[styles.chatRoomHeader, { paddingTop: insets.top + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <View style={styles.chatRoomHeaderText}>
              <Text style={[styles.chatRoomTitle, { color: colors.foreground }]} numberOfLines={1}>
                {roomTitle}
              </Text>
              <Text style={[styles.chatRoomSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {roomSubtitle}
              </Text>
            </View>
            {conversation.status === "connected" && !adminMode ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Pressable
                  onPress={() => {
                    const otherId =
                      conversation.initiatorAccountId === currentAccount?.id
                        ? conversation.ownerAccountId
                        : conversation.initiatorAccountId;
                    if (!otherId) return;
                    Alert.alert(
                      "Report this user?",
                      "This will flag the account for admin review.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Report",
                          style: "destructive",
                          onPress: () => createReport(otherId, "Reported via chat"),
                        },
                      ]
                    );
                  }}
                  style={({ pressed }) => [styles.backBtn, { backgroundColor: "#FEF3C7", opacity: pressed ? 0.75 : 1 }]}
                >
                  <Feather name="flag" size={18} color="#D97706" />
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert(
                    "Close this chat?",
                    "This will end the conversation. The other party will see that the connection was closed.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Close Chat", style: "destructive", onPress: () => { closeConversation(conversationId); onClose(); } },
                    ]
                  )}
                  style={({ pressed }) => [styles.backBtn, { backgroundColor: "#FEE2E2", opacity: pressed ? 0.75 : 1 }]}
                >
                  <Feather name="x-circle" size={20} color="#DC2626" />
                </Pressable>
              </View>
            ) : (
              <View style={[styles.onlineDot, {
                backgroundColor: conversation.status === "pending" ? "#F59E0B"
                  : conversation.status === "denied" ? colors.mutedForeground
                  : conversation.status === "closed" ? "#DC2626"
                  : colors.primary,
              }]} />
            )}
          </View>

          {conversation.status === "connected" && !adminMode && (
            <ConnectedParticipantStrip conversation={conversation} onViewProfile={setViewingProfile} />
          )}

          <FlatList
            data={conversation.messages}
            inverted
            keyExtractor={(item) => item.id}
            style={styles.flex}
            contentContainerStyle={[styles.messageContent, { paddingBottom: insets.bottom + 20 }]}
            renderItem={({ item }) => {
              if (item.isSystem) {
                return (
                  <View style={[styles.systemBubble, { backgroundColor: colors.muted }]}>
                    <Feather name="info" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.systemBubbleText, { color: colors.mutedForeground }]}>
                      {item.body}
                    </Text>
                  </View>
                );
              }
              if (item.isAdmin) {
                return (
                  <View style={styles.adminBubbleWrap}>
                    <View style={styles.adminSenderRow}>
                      <Image source={require("@/assets/images/icon.png")} style={styles.adminAvatar} contentFit="cover" />
                      <Text style={styles.adminSenderName}>Admin</Text>
                    </View>
                    <View style={[styles.bubble, styles.adminBubble, { backgroundColor: "#7C2D12", borderColor: "#FCD34D" }]}>
                      <View style={styles.adminTagRow}>
                        <Feather name="shield" size={12} color="#FCD34D" />
                        <Text style={styles.adminTag}>ADMIN WARNING</Text>
                      </View>
                      <Text style={[styles.bubbleText, { color: "#FFF" }]}>{item.body}</Text>
                    </View>
                  </View>
                );
              }
              const isMyMessage = adminMode
                ? false
                : item.senderAccountId
                ? item.senderAccountId === currentAccount?.id
                : item.sender === "me";
              return (
                <View style={{ alignSelf: isMyMessage ? "flex-end" : "flex-start", maxWidth: "84%", gap: 4 }}>
                  <MessageSender accountId={item.senderAccountId} isMe={isMyMessage} />
                  <View
                    style={[
                      styles.bubble,
                      isMyMessage ? styles.mine : styles.theirs,
                      { backgroundColor: isMyMessage ? colors.primary : colors.secondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: isMyMessage ? colors.primaryForeground : colors.secondaryForeground },
                      ]}
                    >
                      {item.body}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Feather name="message-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />

          {adminMode ? (
            <View style={[styles.composer, { borderTopColor: "#FCD34D", paddingBottom: insets.bottom + 10, borderTopWidth: 2, backgroundColor: "rgba(252,211,77,0.08)" }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Send an admin warning…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
              <Pressable
                onPress={submit}
                style={({ pressed }) => [styles.send, { backgroundColor: "#7C2D12", opacity: pressed ? 0.75 : 1 }]}
              >
                <Feather name="shield" color="#FCD34D" size={18} />
              </Pressable>
            </View>
          ) : conversation.status === "pending" ? (
            <View style={[styles.composer, { borderTopColor: "#F59E0B", paddingBottom: insets.bottom + 10, borderTopWidth: 2 }]}>
              <View style={[styles.deniedBanner, { backgroundColor: colors.amberSoft }]}>
                <Feather name="clock" color="#B45309" size={16} />
                <Text style={[styles.deniedBannerText, { color: "#B45309" }]}>Chat inactive — awaiting acceptance of your connection request</Text>
              </View>
            </View>
          ) : conversation.status === "denied" ? (
            <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
              <View style={[styles.deniedBanner, { backgroundColor: colors.muted }]}>
                <Feather name="x-circle" color={colors.mutedForeground} size={16} />
                <Text style={[styles.deniedBannerText, { color: colors.mutedForeground }]}>Connection was not agreed — messaging disabled</Text>
              </View>
            </View>
          ) : conversation.status === "closed" ? (
            conversation.closedByAdmin ? (
              <View style={[styles.composer, { borderTopColor: "#EF4444", paddingBottom: insets.bottom + 10, borderTopWidth: 2 }]}>
                <View style={[styles.deniedBanner, { backgroundColor: "#FEF2F2" }]}>
                  <Feather name="shield" color="#DC2626" size={16} />
                  <Text style={[styles.deniedBannerText, { color: "#DC2626" }]}>This chat has been closed by an admin and cannot be reopened</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 10, gap: 8 }]}>
                <View style={[styles.deniedBanner, { backgroundColor: colors.muted }]}>
                  <Feather name="minus-circle" color={colors.mutedForeground} size={16} />
                  <Text style={[styles.deniedBannerText, { color: colors.mutedForeground }]}>
                    Chat was closed by {conversation.closedByName ?? "the other party"}
                  </Text>
                </View>
                {!conversation.hiddenForAccountIds?.includes(currentAccount?.id ?? "") && (
                  <Pressable
                    onPress={() => { closeConversation(conversationId); onClose(); }}
                    style={({ pressed }) => [styles.deniedBanner, { backgroundColor: colors.secondary, justifyContent: "center", opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Feather name="x" color={colors.mutedForeground} size={14} />
                    <Text style={[styles.deniedBannerText, { color: colors.mutedForeground, fontWeight: "600" }]}>Close & Remove from List</Text>
                  </Pressable>
                )}
              </View>
            )
          ) : (
            <View style={[styles.composerWrap, { borderTopColor: isBroadcast ? colors.primary : colors.border, paddingBottom: insets.bottom + 10 }]}>
              {canBroadcast && (
                <Pressable
                  onPress={() => setIsBroadcast((v) => !v)}
                  style={[styles.broadcastRow, { backgroundColor: isBroadcast ? colors.primary + "18" : colors.secondary }]}
                >
                  <View style={[styles.broadcastCheckbox, { borderColor: isBroadcast ? colors.primary : colors.mutedForeground, backgroundColor: isBroadcast ? colors.primary : "transparent" }]}>
                    {isBroadcast && <Feather name="check" size={11} color="#FFF" />}
                  </View>
                  <Feather name="radio" size={13} color={isBroadcast ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.broadcastLabel, { color: isBroadcast ? colors.primary : colors.mutedForeground }]}>
                    {isBroadcast
                      ? `Broadcast — ${connectedSiblings.length} connected chats will receive this`
                      : "Broadcast to all connected chats for this advert"}
                  </Text>
                </Pressable>
              )}
              <View style={styles.composerRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={isBroadcast ? `Message all ${connectedSiblings.length} connected chats…` : "Message privately…"}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: isBroadcast ? colors.primary + "12" : colors.muted, color: colors.foreground, borderWidth: isBroadcast ? 1.5 : 0, borderColor: isBroadcast ? colors.primary : "transparent" }]}
                  onSubmitEditing={submit}
                  returnKeyType="send"
                />
                <Pressable
                  onPress={submit}
                  style={({ pressed }) => [styles.send, { backgroundColor: isBroadcast ? colors.primary : colors.primary, opacity: pressed ? 0.75 : 1 }]}
                >
                  <Feather name={isBroadcast ? "radio" : "send"} color={colors.primaryForeground} size={18} />
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { conversations, markConversationRead, currentAccount } = useSportsConnect();

  const isClubLocked = currentAccount?.role === "club" && currentAccount?.clubApprovalStatus !== "approved";
  const clubLockStatus = currentAccount?.clubApprovalStatus ?? "pending";

  const [page, setPage] = useState(0);
  const [openConv, setOpenConv] = useState<Conversation | null>(null);

  if (isClubLocked) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: clubLockStatus === "rejected" ? "#FEF2F2" : "#FFFBEB", alignItems: "center", justifyContent: "center" }}>
            <Feather name={clubLockStatus === "rejected" ? "x-circle" : "lock"} size={32} color={clubLockStatus === "rejected" ? "#DC2626" : "#D97706"} />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 22, color: colors.foreground, textAlign: "center", letterSpacing: -0.4 }}>
            {clubLockStatus === "rejected" ? "Account Not Approved" : "Approval Pending"}
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }}>
            {clubLockStatus === "rejected"
              ? `Your ${getClubLabel(currentAccount).toLowerCase()} application was not approved. Messaging is not available. Please contact support for more information.`
              : `Your ${getClubLabel(currentAccount).toLowerCase()} account is awaiting admin approval. Messaging will be available once an admin approves your ${getClubLabel(currentAccount).toLowerCase()}.\n\nVisit your Profile tab to check your approval status.`}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const visibleConvs = conversations.filter((c) => !c.hiddenForAccountIds?.includes(currentAccount?.id ?? ""));
  const boxWidth = Math.max(100, (screenWidth - 40 - BOX_GAP) / 2);
  const totalPages = Math.ceil(visibleConvs.length / PAGE_SIZE);
  const paged = visibleConvs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleBoxPress = (conv: Conversation) => {
    if (conv.hasUnread && conv.status !== "pending") {
      markConversationRead(conv.id);
    }
    setOpenConv(conv);
  };

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.kicker, { color: colors.primary }]}>Private messaging</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Communication Hub</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Connect request</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Unread messages</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Not agreed</Text>
          </View>
        </View>

        {conversations.length === 0 ? (
          <EmptyState
            icon="message-circle"
            title="No chats yet"
            text="Agree to connect on an advert and a private conversation will open here."
          />
        ) : (
          <>
            <View style={styles.grid}>
              {paged.map((conv) => (
                <ChatBox key={conv.id} conversation={conv} boxWidth={boxWidth} onPress={() => handleBoxPress(conv)} currentAccountId={currentAccount?.id} />
              ))}
            </View>

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={[styles.pageArrow, { opacity: page === 0 ? 0.3 : 1 }]}
                >
                  <Feather name="chevron-left" size={20} color={colors.foreground} />
                </Pressable>

                <View style={styles.pageDots}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Pressable key={i} onPress={() => setPage(i)}>
                      <View
                        style={[
                          styles.pageDot,
                          { backgroundColor: i === page ? colors.primary : colors.border },
                          i === page && styles.pageDotActive,
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  style={[styles.pageArrow, { opacity: page === totalPages - 1 ? 0.3 : 1 }]}
                >
                  <Feather name="chevron-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {openConv && <ChatRoom conversationId={openConv.id} onClose={() => setOpenConv(null)} />}
    </ScreenShell>
  );
}

const subtleShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.14,
  shadowRadius: 9,
  elevation: 4,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  headerBlock: { gap: 4 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  legendRow: { flexDirection: "row", gap: 18 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontWeight: "600", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: BOX_GAP },
  chatBox: {
    minHeight: 160,
    borderRadius: 22,
    borderWidth: 2,
    overflow: "hidden",
  },
  statusBar: { height: 5, width: "100%" },
  chatBoxInner: { padding: 14, gap: 8, flex: 1 },
  pendingIconWrap: { alignItems: "center", gap: 6 },
  pendingIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBoxStatus: { fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  avatarsRow: { flexDirection: "row", alignItems: "center" },
  chatBoxName: { fontWeight: "700", fontSize: 14, lineHeight: 19, marginTop: 2 },
  chatBoxSport: { fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  chatBoxPreview: { fontWeight: "500", fontSize: 12, lineHeight: 17 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 4 },
  pageArrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageDots: { flexDirection: "row", alignItems: "center", gap: 8 },
  pageDot: { width: 8, height: 8, borderRadius: 4 },
  pageDotActive: { width: 22, borderRadius: 4 },
  chatRoomWrap: { flex: 1 },
  chatRoomHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chatRoomHeaderText: { flex: 1 },
  chatRoomTitle: { fontWeight: "700", fontSize: 18 },
  chatRoomSubtitle: { fontWeight: "500", fontSize: 13, marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  messageContent: { padding: 16, gap: 8 },
  bubble: { maxWidth: "84%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 5 },
  theirs: { alignSelf: "flex-start", borderBottomLeftRadius: 5 },
  bubbleText: { fontWeight: "500", fontSize: 15, lineHeight: 21 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyChatText: { fontWeight: "500", fontSize: 15 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  composerWrap: {
    flexDirection: "column",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  broadcastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  broadcastCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  broadcastLabel: {
    flex: 1,
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontWeight: "500",
    fontSize: 15,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deniedBanner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14 },
  deniedBannerText: { fontWeight: "600", fontSize: 13, flex: 1 },
  systemBubble: { alignSelf: "center", flexDirection: "row", alignItems: "flex-start", gap: 6, marginVertical: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "92%" },
  systemBubbleText: { fontWeight: "500", fontSize: 13, lineHeight: 19, flex: 1, fontStyle: "italic" },
  adminBubbleWrap: { alignSelf: "center", maxWidth: "92%", gap: 6 },
  adminSenderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 2 },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 2 },
  senderAvatar: { width: 22, height: 22, borderRadius: 11, overflow: "hidden" },
  senderName: { color: "#000", fontWeight: "700", fontSize: 12, letterSpacing: 0.2 },
  adminAvatar: { width: 22, height: 22, borderRadius: 11 },
  adminSenderName: { color: "#FCD34D", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
  adminBubble: { borderWidth: 1, gap: 6 },
  adminTagRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  adminTag: { color: "#FCD34D", fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },
});

const participantStyles = StyleSheet.create({
  strip: { borderBottomWidth: 1, flexGrow: 0 },
  stripContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, alignItems: "center" },
  tile: { ...subtleShadow, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  tileText: { gap: 2, maxWidth: 120 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "600", fontSize: 12 },
  viewLink: { fontWeight: "700", fontSize: 11, textDecorationLine: "underline" },
});

const profileStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%", overflow: "hidden" },
  closeBtn: { position: "absolute", top: 14, right: 14, zIndex: 10, width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetContent: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  profileHead: { alignItems: "center", gap: 8, marginBottom: 4 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%" as const, height: "100%" as const },
  avatarInitials: { fontWeight: "800", fontSize: 28 },
  displayName: { fontWeight: "700", fontSize: 20, textAlign: "center", letterSpacing: -0.3 },
  rolePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontWeight: "600", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { ...subtleShadow, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  rowText: { fontWeight: "500", fontSize: 14, flex: 1 },
  bioBox: { ...subtleShadow, padding: 14, borderRadius: 14 },
  bioText: { fontWeight: "400", fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  premiumBadge: { position: "absolute", bottom: -2, right: -4, backgroundColor: "#FFF", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  enlargedWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  enlargedClose: { position: "absolute", top: 24, right: 24, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  enlargedImg: { width: "100%", height: "80%" as any },
  reportBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 8 },
});
