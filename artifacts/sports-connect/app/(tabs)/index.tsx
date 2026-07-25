import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { FlatList, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountRole, Advert, Conversation, useSportsConnect } from "@/context/SportsConnectContext";
import { IconButton, Pill, PrimaryButton, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { containsProfanity } from "@/utils/profanityFilter";
import { allSportsFilterName, getSportTheme } from "@/constants/sports";
import { useColors } from "@/hooks/useColors";
import { getAgeBlockReason } from "@/utils/ageEligibility";
import { parseDobAge, formatTrialDateDisplay } from "@/utils/dateUtils";
import { COACH_EXPERIENCE_LEVELS } from "@/constants/coachLevels";
import { COACH_SUB_ROLES, coachSubRoleLabel } from "@/constants/coachSubRoles";
import { getClubLabel } from "@/constants/clubLabel";

const heroImage = require("@/assets/images/training-hero.png");

type Filter = "all" | "players-wanted" | "player-looking" | "coach-looking" | "coach-wanted" | "club-trials" | "club-friendly" | "near" | "expiring-soon";
type SortOrder = "newest" | "oldest";
const australianStates = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
type AustralianStateFilter = (typeof australianStates)[number];

const FREE_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000;
const PAID_LIFESPAN_MS = 14 * 24 * 60 * 60 * 1000;
const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

function getExpiryInfo(advert: Pick<Advert, "createdAt" | "ownerSubscriptionStatus">) {
  const lifespanMs = advert.ownerSubscriptionStatus === "active" ? PAID_LIFESPAN_MS : FREE_LIFESPAN_MS;
  const expiresAt = new Date(advert.createdAt).getTime() + lifespanMs;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return { expired: true, expiringSoon: false, label: "Expired", remainingMs: 0, days: 0, hours: 0, mins: 0 };
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const expiringSoon = remaining <= EXPIRING_SOON_MS;
  return { expired: false, expiringSoon, label: `${days}d ${hours}h ${mins}m remaining`, remainingMs: remaining, days, hours, mins };
}

function typeLabel(type: Advert["type"]) {
  return type === "players-wanted" ? "Players Wanted for Team"
    : type === "player-looking" ? "Player Looking for Club"
    : type === "coach-looking" ? "Coach Looking for Team/Club"
    : type === "coach-wanted" ? "Staff (Coach/TD) Wanted for Club"
    : type === "club-trials" ? "Club Trials Info"
    : type === "club-friendly" ? "Club Friendly"
    : "";
}

function sportMatchesProfile(advertSport: string, viewerSports?: string[]): boolean {
  if (!viewerSports || viewerSports.length === 0) return false;
  return viewerSports.includes(advertSport);
}

function canRequestConnection(viewerRole: AccountRole, advert: Advert, affiliatedClubId?: string, viewerSports?: string[]): boolean {
  if (!sportMatchesProfile(advert.sport, viewerSports)) return false;

  const viewerIsPlayerOrParent = viewerRole === "player" || viewerRole === "guardian";
  const viewerIsCoach = viewerRole === "coach";
  const viewerIsClub = viewerRole === "club";
  const viewerIsAffiliatedCoach = viewerIsCoach && !!affiliatedClubId;

  switch (advert.type) {
    case "players-wanted":
      return viewerIsPlayerOrParent;
    case "club-trials":
      return viewerIsPlayerOrParent;
    case "coach-wanted":
      return viewerIsCoach;
    case "player-looking":
      return viewerIsClub || viewerIsAffiliatedCoach;
    case "coach-looking":
      return viewerIsClub;
    case "club-friendly":
      return viewerIsClub || viewerIsAffiliatedCoach;
    default:
      return false;
  }
}

function getConnectableAdvertTypes(role: AccountRole, affiliatedClubId?: string | null): Filter[] {
  const viewerIsPlayerOrParent = role === "player" || role === "guardian";
  const viewerIsCoach = role === "coach";
  const viewerIsClub = role === "club";
  const viewerIsAffiliatedCoach = viewerIsCoach && !!affiliatedClubId;
  const types: Filter[] = [];
  if (viewerIsPlayerOrParent) {
    types.push("players-wanted", "club-trials");
  }
  if (viewerIsCoach) {
    types.push("coach-wanted");
  }
  if (viewerIsAffiliatedCoach || viewerIsClub) {
    types.push("player-looking", "club-friendly");
  }
  if (viewerIsClub) {
    types.push("coach-looking");
  }
  return types;
}

function requesterTypeLabel(type?: AccountRole, coachSubRole?: string | null, count = 1, clubType?: string): string {
  const base = type === "club" ? getClubLabel({ clubType }) : type === "coach" ? coachSubRoleLabel(coachSubRole) : "Player";
  return count === 1 ? base : `${base}s`;
}

function convGroupLabel(convs: Pick<Conversation, "requesterType" | "requesterCoachSubRole">[], singular = "Person", plural = "People"): string {
  if (convs.length === 0) return plural;
  const types = [...new Set(convs.map((c) => c.requesterType))];
  const first = convs[0];
  return types.length === 1 ? requesterTypeLabel(types[0], first?.requesterCoachSubRole, convs.length) : convs.length === 1 ? singular : plural;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailCopy, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function AdvertCard({ advert, onPress }: { advert: Advert; onPress: () => void }) {
  const colors = useColors();
  const { accounts, conversations, currentAccount } = useSportsConnect();
  const expiry = getExpiryInfo(advert);
  const icon = advert.postedByType === "club" ? "shield" : "user";
  const posterAccount = accounts.find((a) => a.id === advert.ownerAccountId);
  const posterIsSubscribed = posterAccount?.subscriptionStatus === "active";
  // Amber highlight when the viewer owns this advert and has pending requests.
  const isOwn = !!(currentAccount?.id && advert.ownerAccountId === currentAccount.id);
  const hasPending = isOwn && conversations.some((c) => c.advertId === advert.id && c.status === "pending");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.adCard, { backgroundColor: hasPending ? "#FFFBEB" : colors.card, borderColor: hasPending ? "#F59E0B" : colors.foreground, borderWidth: 2, opacity: pressed ? 0.78 : 1 }]}>
      <View style={[styles.adIcon, { backgroundColor: colors.pitchSoft }]}>
        <Feather name={icon} color={colors.primary} size={20} />
      </View>
      <View style={styles.adBody}>
        <View style={styles.adMetaRow}>
          <Text style={[styles.adMeta, { color: colors.primary }]}>{advert.sport}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {posterIsSubscribed ? (
              <View style={styles.goldBadge}>
                <Feather name="star" size={11} color="#D97706" />
              </View>
            ) : null}
            <Text style={[styles.adDistance, { color: colors.mutedForeground }]}>{advert.distanceKm} km</Text>
          </View>
        </View>
        <Text style={[styles.adTitle, { color: colors.foreground }]}>{advert.title}</Text>
        {advert.teamGender ? <Text style={[styles.adText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.teamGender}</Text> : null}
        {advert.playerGender ? <Text style={[styles.adText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.playerGender}</Text> : null}
        {advert.focusArea ? <Text style={[styles.adText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.focusArea}</Text> : advert.ageGroup ? <Text style={[styles.adText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.ageGroup}</Text> : null}
        <Text style={[styles.adExpiry, { color: expiry.expired ? "#D9534F" : colors.mutedForeground }]}>{expiry.label}</Text>
      </View>
    </Pressable>
  );
}

function AdvertDetail({ advert, onClose }: { advert: Advert; onClose: () => void }) {
  const colors = useColors();
  const router = useRouter();
  const { connectOnAdvert, acceptConnection, denyConnection, conversations, approvedSports, currentAccount, accounts, forbiddenConnections, createReport, hasReportedAdvert } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  const expiry = getExpiryInfo(advert);
  const posterAccount = accounts.find((a) => a.id === advert.ownerAccountId);
  const isOwnAdvert = !!(currentAccount?.id && advert.ownerAccountId && advert.ownerAccountId === currentAccount.id);
  const isAffiliatedClubParticipant = !isOwnAdvert && !!(currentAccount?.id && advert.affiliatedClubId && advert.affiliatedClubId === currentAccount.id);
  const isAffiliatedCoachOfOwner = !isOwnAdvert && !isAffiliatedClubParticipant && !!(
    currentAccount?.role === "coach" &&
    currentAccount?.affiliatedClubId &&
    advert.ownerAccountId === currentAccount.affiliatedClubId
  );
  const isOwnOrAffiliated = isOwnAdvert || isAffiliatedClubParticipant || isAffiliatedCoachOfOwner;
  const advertConvs = conversations.filter((c) => c.advertId === advert.id);
  const connectedConvs = isOwnOrAffiliated ? advertConvs.filter((c) => c.status === "connected") : [];
  const pendingConvs = isOwnOrAffiliated ? advertConvs.filter((c) => c.status === "pending") : [];
  const firstPending = pendingConvs[0] ?? null;
  const myRequest = !isOwnOrAffiliated
    ? advertConvs.find((c) =>
        c.initiatorAccountId === currentAccount?.id ||
        (currentAccount?.id && c.affiliatedClubParticipants?.includes(currentAccount.id) && c.initiatorAccountId !== currentAccount.id)
      )
    : undefined;
  const isConnected = !isOwnAdvert && myRequest?.status === "connected";
  const isForbiddenPair = !isOwnAdvert && !!(currentAccount?.id && advert.ownerAccountId &&
    forbiddenConnections.some((f) =>
      f.advertId === advert.id &&
      ((f.accountIdA === currentAccount.id && f.accountIdB === advert.ownerAccountId) ||
       (f.accountIdA === advert.ownerAccountId && f.accountIdB === currentAccount.id))
    )
  );
  const ageBlockReason = getAgeBlockReason(currentAccount ?? null, advert);

  const posterLabel = isConnected
    ? advert.postedBy
    : advert.postedByType === "club" ? (posterAccount?.clubType === "academy" ? "An Academy" : "A Club") : advert.postedByType === "player" ? "A Player" : "A Coach";

  const [isConnecting, setIsConnecting] = useState(false);

  const doConnect = async () => {
    setIsConnecting(true);
    try {
      await connectOnAdvert(advert);
    } finally {
      setIsConnecting(false);
    }
  };

  const proceedAfterSportCheck = () => {
    const AU_STATE_LIST = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
    const extractState = (loc: string) => {
      const last = loc.trim().split(" ").pop()?.toUpperCase() ?? "";
      return AU_STATE_LIST.includes(last) ? last : "";
    };
    const viewerState = extractState(currentAccount?.location ?? "");
    const advertState = extractState(advert.location);
    if (viewerState && advertState && viewerState !== advertState) {
      const posterLabel = advert.postedByType === "club" ? getClubLabel(posterAccount) : advert.postedByType === "player" ? "Player" : "Coach";
      Alert.alert(
        "Different State",
        `You are requesting to connect privately with a ${posterLabel} from a different State (${advertState}). Are you sure?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Connect", onPress: doConnect },
        ]
      );
      return;
    }
    doConnect();
  };

  const connect = () => {
    if (isConnecting || myRequest) return;
    const viewerSports = currentAccount?.sports ?? [];
    const advertSport = advert.sport;
    const sportInProfile = viewerSports.includes(advertSport);
    const isDefaultSport = currentAccount?.defaultSport === advertSport;
    if (sportInProfile && !isDefaultSport) {
      Alert.alert(
        "Sport Mismatch",
        "Did you want to change your default sport before making this request? Your default sport doesn't match the sport of this advertisement and it's likely the Club will decline you.",
        [
          { text: "Yes, update my profile", onPress: () => { onClose(); router.navigate("/(tabs)/profile"); } },
          { text: "No, send request anyway", onPress: proceedAfterSportCheck },
        ]
      );
      return;
    }
    proceedAfterSportCheck();
  };

  const trainingSchedule = (() => {
    if (!advert.trainingDays && !advert.trainingTbd) return null;
    if (advert.trainingTbd) return "TBD";
    const days = (advert.trainingDays ?? []).join(", ");
    const times = [advert.trainingTimeFrom, advert.trainingTimeTo].filter(Boolean).join(" – ");
    return [days, times].filter(Boolean).join("  |  ");
  })();

  const gameSchedule = (() => {
    if (!advert.gameDays && !advert.gameTbd) return null;
    if (advert.gameTbd) return "TBD";
    const days = (advert.gameDays ?? []).join(", ");
    const times = [advert.gameTimeFrom, advert.gameTimeTo].filter(Boolean).join(" – ");
    return [days, times].filter(Boolean).join("  |  ");
  })();

  const feesLabel = (() => {
    if (advert.feesFree) return "Free / Scholarship";
    if (!advert.seasonFees) return null;
    const base = `AUD $${advert.seasonFees.toFixed(2)}`;
    return advert.feesNegotiable ? `${base} (or near offer)` : base;
  })();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          {/* ── Expiry bar ── */}
          <View style={[styles.expiryBar, { backgroundColor: expiry.expired ? "#FDECEA" : colors.pitchSoft }]}>
            <Feather name="clock" color={expiry.expired ? "#D9534F" : colors.primary} size={14} />
            <Text style={[styles.expiryBarText, { color: expiry.expired ? "#D9534F" : colors.primary }]}>
              {expiry.expired ? "This advert has expired" : `Advert expires in ${expiry.label}`}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalTop}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.modalIcon, { backgroundColor: theme.soft }]}>
                  <Feather name={advert.postedByType === "club" ? "shield" : "user"} color={theme.primary} size={24} />
                </View>
                {accounts.find((a) => a.id === advert.ownerAccountId)?.subscriptionStatus === "active" ? (
                  <View style={[styles.goldBadge, { width: 26, height: 26, borderRadius: 13 }]}>
                    <Feather name="star" size={13} color="#D97706" />
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {!isOwnAdvert && advert.ownerAccountId && currentAccount?.id !== advert.ownerAccountId ? (
                  hasReportedAdvert(advert.id) ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 12, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }}>
                      <Feather name="flag" size={14} color="#9CA3AF" />
                    </View>
                  ) : (
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
                                  { text: "Report", style: "destructive", onPress: () => {
                                    createReport(advert.ownerAccountId!, "I believe this person is underage", advert.id);
                                    Alert.alert("Report submitted", "Thank you. This advert has been reported and will be reviewed by our team.");
                                  }},
                                ]
                              );
                            }},
                            { text: "Inappropriate behaviour", onPress: () => {
                              createReport(advert.ownerAccountId!, "Inappropriate behaviour", advert.id);
                              Alert.alert("Report submitted", "Thank you. This advert has been reported and will be reviewed by our team.");
                            }},
                            { text: "Spam / fake account", onPress: () => {
                              createReport(advert.ownerAccountId!, "Spam / fake account", advert.id);
                              Alert.alert("Report submitted", "Thank you. This advert has been reported and will be reviewed by our team.");
                            }},
                            { text: "Other", onPress: () => {
                              createReport(advert.ownerAccountId!, "Other", advert.id);
                              Alert.alert("Report submitted", "Thank you. This advert has been reported and will be reviewed by our team.");
                            }},
                          ]
                        );
                      }}
                      style={({ pressed }) => [
                        { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 12, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FCA5A5", opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Feather name="flag" size={14} color="#DC2626" />
                    </Pressable>
                  )
                ) : null}
                <IconButton icon="x" label="Close" onPress={onClose} />
              </View>
            </View>

            <Text style={[styles.detailType, { color: theme.primary }]}>{typeLabel(advert.type)}</Text>
            <Text style={[styles.detailTitle, { color: colors.foreground }]}>{advert.title}</Text>

            {/* ── Chips ── */}
            <View style={styles.detailGrid}>
              <View style={[styles.detailChip, { backgroundColor: theme.soft }]}>
                <Text style={[styles.detailChipText, { color: theme.primary }]}>{advert.sport}</Text>
              </View>
              {advert.type === "club-friendly" && advert.friendlySubType ? (
                <View style={[styles.detailChip, { backgroundColor: colors.pitchSoft }]}>
                  <Text style={[styles.detailChipText, { color: colors.primary }]}>
                    {advert.friendlySubType === "available" ? "Available" : "Wanted"}
                  </Text>
                </View>
              ) : null}
              {advert.type !== "club-friendly" && advert.level ? <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.level}</Text></View> : null}
              {advert.teamGender ? <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.teamGender}</Text></View> : null}
              {advert.playerGender ? <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.playerGender}</Text></View> : null}
              <View style={[styles.detailChip, { backgroundColor: colors.amberSoft }]}>
                <Text style={[styles.detailChipText, { color: colors.accentForeground }]}>{advert.distanceKm} km away</Text>
              </View>
              {advert.focusArea ? <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.focusArea}</Text></View> : null}
              {advert.ageGroup ? <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.ageGroup}</Text></View> : null}
              {advert.preferredAge ? <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>Age {advert.preferredAge}</Text></View> : null}
              {advert.type !== "club-friendly" && advert.trialRequired ? <View style={[styles.detailChip, { backgroundColor: colors.amberSoft }]}><Text style={[styles.detailChipText, { color: colors.accentForeground }]}>Trial required</Text></View> : null}
              {advert.type !== "club-friendly" && feesLabel ? <View style={[styles.detailChip, { backgroundColor: colors.pitchSoft }]}><Text style={[styles.detailChipText, { color: colors.primary }]}>{feesLabel}</Text></View> : null}
              {advert.type !== "club-friendly" && advert.opportunityStates && advert.opportunityStates.length > 0 ? (
                advert.opportunityStates.length === 8
                  ? <View style={[styles.detailChip, { backgroundColor: colors.pitchSoft }]}><Text style={[styles.detailChipText, { color: colors.primary }]}>Open to: Australia</Text></View>
                  : advert.opportunityStates.map((s) => <View key={s} style={[styles.detailChip, { backgroundColor: colors.pitchSoft }]}><Text style={[styles.detailChipText, { color: colors.primary }]}>{s}</Text></View>)
              ) : null}
            </View>

            {/* ── Connection notification ── */}
            {isOwnOrAffiliated && connectedConvs.length > 0 ? (
              <View style={[styles.connectedBadge, { backgroundColor: colors.pitchSoft }]}>
                <Feather name="check-circle" color={colors.primary} size={18} />
                <Text style={[styles.connectedText, { color: colors.primary }]}>
                  {`You are connected to ${connectedConvs.length} ${convGroupLabel(connectedConvs)} — message ${connectedConvs.length === 1 ? "this person" : "these people"} in the Messages tab`}
                </Text>
              </View>
            ) : !isOwnOrAffiliated && myRequest?.status === "connected" ? (
              <View style={[styles.connectedBadge, { backgroundColor: colors.pitchSoft }]}>
                <Feather name="check-circle" color={colors.primary} size={18} />
                <Text style={[styles.connectedText, { color: colors.primary }]}>You are connected — message in the Messages tab</Text>
              </View>
            ) : null}

            {/* ── Positions ── */}
            {advert.positions && advert.positions.length > 0 ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Position(s)</Text>
                <View style={styles.tagRow}>
                  {advert.positions.map((p) => (
                    <View key={p} style={[styles.tag, { backgroundColor: theme.soft }]}>
                      <Text style={[styles.tagText, { color: theme.primary }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* ── Posted by (hidden until connected) ── */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Posted by</Text>
              {isConnected ? (
                <Text style={[styles.detailCopy, { color: colors.foreground }]}>{posterLabel} · {advert.location}</Text>
              ) : (
                <View style={styles.hiddenRow}>
                  <Text style={[styles.detailCopy, { color: colors.foreground }]}>{posterLabel} · {advert.location}</Text>
                  <View style={[styles.hiddenBadge, { backgroundColor: colors.amberSoft }]}>
                    <Feather name="lock" size={11} color={colors.accentForeground} />
                    <Text style={[styles.hiddenBadgeText, { color: colors.accentForeground }]}>Connect to see profile</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Player / club description (non-Club-Friendly) ── */}
            {advert.type !== "club-friendly" && advert.playerDescription ? (
              <DetailRow
                label={advert.postedByType === "club" ? "Looking for" : "About the player"}
                value={advert.playerDescription}
              />
            ) : null}

            {/* ── Training days (non-Club-Friendly) ── */}
            {advert.type !== "club-friendly" && trainingSchedule ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  {advert.postedByType === "club" ? "Training days" : "Available training days"}
                </Text>
                <Text style={[styles.detailCopy, { color: colors.foreground }]}>{trainingSchedule}</Text>
              </View>
            ) : null}

            {/* ── Game days (non-Club-Friendly) ── */}
            {advert.type !== "club-friendly" && gameSchedule ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  {advert.postedByType === "club" ? "Game days" : "Available game days"}
                </Text>
                <Text style={[styles.detailCopy, { color: colors.foreground }]}>{gameSchedule}</Text>
              </View>
            ) : null}

            {/* ── Schedule note (non-Club-Friendly) ── */}
            {advert.type !== "club-friendly" && advert.scheduleNote ? (
              <DetailRow label="Training / game day notes" value={advert.scheduleNote} />
            ) : null}

            {/* ── Trial dates (non-Club-Friendly) ── */}
            {advert.type !== "club-friendly" && advert.trialSlots && advert.trialSlots.length > 0 ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Trial dates</Text>
                <View style={{ gap: 4 }}>
                  {advert.trialSlots.map((t, idx) => {
                    const display = formatTrialDateDisplay(t.date);
                    return (
                      <Text key={idx} style={[styles.detailCopy, { color: colors.foreground }]}>
                        {display ? `${display}  ${t.timeFrom ? t.timeFrom : ""}${t.timeTo ? ` – ${t.timeTo}` : ""}` : `${t.date} ${t.timeFrom}${t.timeTo ? `–${t.timeTo}` : ""}`}
                      </Text>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* ── Club Friendly fields ── */}
            {advert.type === "club-friendly" && (
              <>
                {advert.friendlySubType ? <DetailRow label="Friendly Type" value={advert.friendlySubType === "available" ? "Available (looking & able to host a team)" : "Wanted (cannot host but looking for an opponent)"} /> : null}
                {advert.preferredOpponents && advert.preferredOpponents.length > 0 ? <DetailRow label="Preferred Opponent/s" value={advert.preferredOpponents.join(", ")} /> : null}
                {advert.preferredTeamLevel ? <DetailRow label="Preferred Team Level" value={advert.preferredTeamLevel} /> : null}
                {advert.trialSlots && advert.trialSlots.length > 0 ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Friendly Date(s)</Text>
                    <View style={{ gap: 4 }}>
                      {advert.trialSlots.map((t, idx) => {
                        const display = formatTrialDateDisplay(t.date);
                        return (
                          <Text key={idx} style={[styles.detailCopy, { color: colors.foreground }]}>
                            {display ? `${display}  ${t.timeFrom ? t.timeFrom : ""}${t.timeTo ? ` \u2013 ${t.timeTo}` : ""}` : `${t.date} ${t.timeFrom}${t.timeTo ? `\u2013${t.timeTo}` : ""}`}
                          </Text>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                {advert.groundAvailable ? <DetailRow label="Ground Available" value="Yes" /> : null}
                {advert.venueSuburb ? <DetailRow label="Venue" value={`${advert.venueSuburb}${advert.venuePostcode ? ` ${advert.venuePostcode}` : ""}${advert.venueState ? `, ${advert.venueState}` : ""}`} /> : null}
                {advert.refereeType ? <DetailRow label="Referee Type" value={advert.refereeType} /> : null}
                {advert.friendlySuburb ? <DetailRow label="Club Location" value={`${advert.friendlySuburb}${advert.friendlyState ? `, ${advert.friendlyState}` : ""}`} /> : null}
                {advert.friendlyInfo ? <DetailRow label="Additional Info" value={advert.friendlyInfo} /> : null}
              </>
            )}

            {/* ── Standard fields (non-Club-Friendly) ── */}
            {advert.type !== "club-friendly" && (
              <>
                {advert.teamGender ? <DetailRow label="Team Gender" value={advert.teamGender} /> : null}
                {advert.playerGender ? <DetailRow label="Gender" value={advert.playerGender} /> : null}
                <DetailRow label="Level" value={advert.level} />
                {advert.availability && advert.availability !== "TBD | TBD" && !trainingSchedule && !gameSchedule
                  ? <DetailRow label="Availability" value={advert.availability} />
                  : null}
                <DetailRow label="Additional details" value={advert.description} />
              </>
            )}

            <View style={{ height: 16 }} />

            {/* ── Connection section ── */}
            {isOwnOrAffiliated ? (
              <>
                {pendingConvs.length > 0 ? (
                  <Text style={[styles.pendingCountText, { color: colors.foreground }]}>
                    {`You have ${pendingConvs.length} ${convGroupLabel(pendingConvs, "Connection", "Connection")} Request${pendingConvs.length === 1 ? "" : "s"} for this advert.`}
                  </Text>
                ) : null}
                {firstPending ? (
                  <View style={[styles.pendingRequestCard, { backgroundColor: colors.amberSoft, borderColor: "#F59E0B" }]}>
                    {(() => {
                      const req = accounts.find((a) => a.id === firstPending.initiatorAccountId);
                      const isCoachReq = req?.role === "coach";
                      const isAffiliatedCoachReq = isCoachReq && !!req?.affiliatedClubId;
                      const location = firstPending.requesterLocation ?? "an unknown location";
                      const coachLabel = req?.coachSubRole ? coachSubRoleLabel(req.coachSubRole) : "Coach";
                      const affiliatedClub = accounts.find((a) => a.id === req?.affiliatedClubId);
                      const headerText = isAffiliatedCoachReq
                        ? `A ${coachLabel} from ${affiliatedClub?.clubType === "academy" ? "an Academy" : "a Club"} in ${location} wants to connect privately. Agree to connect?`
                        : req?.role === "guardian" && req.parentGuardianName
                        ? `Parent/Guardian ${req.parentGuardianName} on behalf of ${req.playerName ?? "a player"} from ${location} wants to connect privately. Agree to connect?`
                        : req?.role === "club"
                        ? `${req.clubType === "academy" ? "An Academy" : "A Club"} from ${location} wants to connect privately. Agree to connect?`
                        : `A ${requesterTypeLabel(firstPending.requesterType, req?.coachSubRole)} from ${location} wants to connect privately. Agree to connect?`;
                      return (
                        <Text style={[styles.pendingRequestText, { color: colors.foreground }]}>{headerText}</Text>
                      );
                    })()}
                    {(() => {
                      const req = accounts.find((a) => a.id === firstPending.initiatorAccountId);
                      if (!req) return null;
                      const isCoachReq = req.role === "coach";
                      const isAffiliatedCoachReq = isCoachReq && !!req.affiliatedClubId;
                      const age = parseDobAge(req.dateOfBirth);
                      const coachSubRoleLabel = COACH_SUB_ROLES.find((r) => r.value === req.coachSubRole)?.label;
                      const coachLevelLabel = COACH_EXPERIENCE_LEVELS.find((l) => l.value === req.coachCurrentLevel)?.label;

                      let facts: { label: string; value: string }[] = [];
                      let sectionLabel = "About this coach";

                      if (isAffiliatedCoachReq) {
                        // Look up the age group the club assigned to this coach's affiliation
                        const clubAccount = accounts.find((a) => a.id === req.affiliatedClubId);
                        const affiliation = clubAccount?.coachAffiliates?.find((a) => a.coachAccountId === req.id);
                        const teamAgeGroup = affiliation?.teams?.[0]?.ageGroup;
                        facts = [
                          req.gender ? { label: "Gender", value: req.gender } : null,
                          age !== null ? { label: "Age", value: String(age) } : null,
                          coachSubRoleLabel ? { label: "Coaching role", value: coachSubRoleLabel } : null,
                          coachLevelLabel ? { label: "Coaching level", value: coachLevelLabel } : null,
                          teamAgeGroup ? { label: "Club team age group", value: teamAgeGroup } : null,
                        ].filter(Boolean) as { label: string; value: string }[];
                      } else if (isCoachReq) {
                        facts = [
                          req.gender ? { label: "Gender", value: req.gender } : null,
                          age !== null ? { label: "Age", value: String(age) } : null,
                          coachSubRoleLabel ? { label: "Coaching role", value: coachSubRoleLabel } : null,
                          coachLevelLabel ? { label: "Coaching level", value: coachLevelLabel } : null,
                        ].filter(Boolean) as { label: string; value: string }[];
                      } else if (req.role === "guardian") {
                        sectionLabel = "About this guardian & player";
                        facts = [
                          req.gender ? { label: "Gender", value: req.gender } : null,
                          req.dateOfBirth ? { label: "Player DOB", value: `${req.dateOfBirth}${age !== null ? ` \u00b7 Age ${age}` : ""}` } : null,
                          req.location ? { label: "Location", value: req.location } : null,
                          (req.playerPositions ?? []).length > 0 ? { label: "Position/s", value: (req.playerPositions ?? []).join(", ") } : null,
                          req.playerCurrentLevel ? { label: "Playing level", value: req.playerCurrentLevel } : null,
                          req.playerCurrentAgeGroup ? { label: "Age group", value: req.playerCurrentAgeGroup } : null,
                          req.playerCurrentClub ? { label: "Current / prev club", value: req.playerCurrentClub } : null,
                          req.parentGuardianName ? { label: "Guardian", value: req.parentGuardianName } : null,
                        ].filter(Boolean) as { label: string; value: string }[];
                      } else {
                        // Club or player request
                        sectionLabel = req.role === "club" ? `About this ${getClubLabel(req).toLowerCase()}` : "About this player";
                        facts = [
                          req.gender ? { label: "Gender", value: req.gender } : null,
                          req.dateOfBirth ? { label: "DOB", value: `${req.dateOfBirth}${age !== null ? ` \u00b7 Age ${age}` : ""}` } : null,
                          req.location ? { label: "Location", value: req.location } : null,
                          (req.playerPositions ?? []).length > 0 ? { label: "Position/s", value: (req.playerPositions ?? []).join(", ") } : null,
                          req.playerCurrentLevel ? { label: "Playing level", value: req.playerCurrentLevel } : null,
                          req.playerCurrentAgeGroup ? { label: "Age group", value: req.playerCurrentAgeGroup } : null,
                          req.playerCurrentClub ? { label: "Current / prev club", value: req.playerCurrentClub } : null,
                        ].filter(Boolean) as { label: string; value: string }[];
                      }

                      if (facts.length === 0) return null;
                      return (
                        <View style={{ borderTopWidth: 1, borderTopColor: "#F59E0B44", paddingTop: 10, gap: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
                            {sectionLabel}
                          </Text>
                          {facts.map((f) => (
                            <View key={f.label} style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground, minWidth: 100 }}>{f.label}:</Text>
                              <Text style={{ fontSize: 12, color: colors.foreground, flex: 1, flexShrink: 1 }}>{f.value}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                    <View style={styles.acceptDenyRow}>
                      <Pressable
                        onPress={() => acceptConnection(firstPending.id)}
                        style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Feather name="check" color="#FFFFFF" size={20} />
                        <Text style={styles.acceptDenyBtnText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => denyConnection(firstPending.id)}
                        style={({ pressed }) => [styles.denyBtn, { opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Feather name="x" color="#FFFFFF" size={20} />
                        <Text style={styles.acceptDenyBtnText}>Deny</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.connectedBadge, { backgroundColor: colors.secondary }]}>
                    <Feather name="inbox" color={colors.mutedForeground} size={18} />
                    <Text style={[styles.connectedText, { color: colors.mutedForeground }]}>You have no New Connection Requests.</Text>
                  </View>
                )}
              </>
            ) : myRequest?.status === "closed" || isForbiddenPair ? (
              <View style={[styles.connectedBadge, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", borderWidth: 1 }]}>
                <Feather name="slash" color="#DC2626" size={18} />
                <Text style={[styles.connectedText, { color: "#DC2626" }]}>Connection not available — this chat was closed by an admin</Text>
              </View>
            ) : myRequest?.status === "pending" ? (
              <View style={[styles.connectedBadge, { backgroundColor: colors.amberSoft }]}>
                <Feather name="clock" color="#F59E0B" size={18} />
                <Text style={[styles.connectedText, { color: "#F59E0B" }]}>Connection Request Sent — awaiting response</Text>
              </View>
            ) : myRequest?.status === "denied" ? (
              <View style={[styles.connectedBadge, { backgroundColor: "#FDECEA" }]}>
                <Feather name="x-circle" color="#D9534F" size={18} />
                <Text style={[styles.connectedText, { color: "#D9534F" }]}>Your connection request was not accepted</Text>
              </View>
            ) : myRequest?.status === "connected" ? null : (
              !sportMatchesProfile(advert.sport, currentAccount?.sports) ? (
                <View style={[styles.connectedBadge, { backgroundColor: colors.secondary }]}>
                  <Feather name="lock" color={colors.mutedForeground} size={18} />
                  <Text style={[styles.connectedText, { color: colors.mutedForeground }]}>This advert is for {advert.sport} — add it to your profile to connect</Text>
                </View>
              ) : canRequestConnection(currentAccount?.role ?? "player", advert, currentAccount?.affiliatedClubId, currentAccount?.sports) ? (
                ageBlockReason ? (
                  <View style={[styles.connectedBadge, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", borderWidth: 1 }]}>
                    <Feather name="alert-circle" color="#DC2626" size={18} />
                    <Text style={[styles.connectedText, { color: "#DC2626" }]}>{ageBlockReason}</Text>
                  </View>
                ) : isConnecting ? (
                  <View style={[styles.connectedBadge, { backgroundColor: colors.pitchSoft }]}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[styles.connectedText, { color: colors.primary }]}>Sending connection request…</Text>
                  </View>
                ) : (
                  <PrimaryButton label="Request to connect privately" icon="message-circle" onPress={connect} />
                )
              ) : (
                <View style={[styles.connectedBadge, { backgroundColor: colors.secondary }]}>
                  <Feather name="lock" color={colors.mutedForeground} size={18} />
                  <Text style={[styles.connectedText, { color: colors.mutedForeground }]}>You cannot connect with this advert type</Text>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  nearCount: number;
  pendingConvs: Conversation[];
  unreadConvCount: number;
  notificationSettings: { enabled: boolean; radiusKm: number; locationLabel: string };
  onToggleNotifications: () => Promise<void>;
  onSetRadius: (km: number) => void;
  onGoToMessages: () => void;
  onGoToDiscover: () => void;
  onSelectAdvert: (advertId: string) => void;
};

function NotificationPanel({
  open, onClose, nearCount, pendingConvs, unreadConvCount,
  notificationSettings, onToggleNotifications, onSetRadius,
  onGoToMessages, onGoToDiscover, onSelectAdvert,
}: NotificationPanelProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts } = useSportsConnect();
  const isEmpty = nearCount === 0 && pendingConvs.length === 0 && unreadConvCount === 0;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 24, maxHeight: "85%" }}>
          {/* Drag handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontWeight: "800", fontSize: 20, color: colors.foreground, letterSpacing: -0.4 }}>Notifications</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 10 }}>
            {isEmpty ? (
              <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="check-circle" size={26} color={colors.primary} />
                </View>
                <Text style={{ fontWeight: "700", fontSize: 16, color: colors.foreground }}>You're all caught up</Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: "center", lineHeight: 19 }}>No pending requests or unread messages right now.</Text>
              </View>
            ) : (
              <>
                {/* Nearby adverts row */}
                {nearCount > 0 ? (
                  <Pressable
                    onPress={onGoToDiscover}
                    style={({ pressed }) => ({ backgroundColor: colors.card, borderRadius: 16, padding: 14, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, opacity: pressed ? 0.8 : 1, borderWidth: 1, borderColor: colors.border })}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="map-pin" size={17} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", fontSize: 14, color: colors.foreground }}>{nearCount} advert{nearCount === 1 ? "" : "s"} nearby</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Within your {notificationSettings.radiusKm} km radius</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}

                {/* One row per pending connection request */}
                {pendingConvs.map((conv) => {
                  const reqAccount = accounts.find((a) => a.id === conv.initiatorAccountId);
                  const typeLabel =
                    conv.requesterType === "coach" ? "Coach" :
                    conv.requesterType === "guardian" ? "Parent / Guardian" :
                    conv.requesterType === "club" ? getClubLabel(reqAccount) : "Player";
                  const rawTitle = conv.advertTitle ?? "your advert";
                  const title = rawTitle.length > 38 ? rawTitle.slice(0, 38) + "…" : rawTitle;
                  return (
                    <Pressable
                      key={conv.id}
                      onPress={() => onSelectAdvert(conv.advertId)}
                      style={({ pressed }) => ({ backgroundColor: "#FFFBEB", borderRadius: 16, padding: 14, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, opacity: pressed ? 0.8 : 1, borderWidth: 1, borderColor: "#FDE68A" })}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" }}>
                        <Feather name="user-check" size={17} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 14, color: "#92400E" }}>Connection request</Text>
                        <Text style={{ fontSize: 12, color: "#B45309", marginTop: 2 }} numberOfLines={2}>{typeLabel} requested to connect to '{title}'</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color="#D97706" />
                    </Pressable>
                  );
                })}

                {/* Unread messages row */}
                {unreadConvCount > 0 ? (
                  <Pressable
                    onPress={onGoToMessages}
                    style={({ pressed }) => ({ backgroundColor: "#EFF6FF", borderRadius: 16, padding: 14, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, opacity: pressed ? 0.8 : 1, borderWidth: 1, borderColor: "#BFDBFE" })}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="message-circle" size={17} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", fontSize: 14, color: "#1E40AF" }}>Unread messages</Text>
                      <Text style={{ fontSize: 12, color: "#3B82F6", marginTop: 2 }}>
                        {unreadConvCount} unread message{unreadConvCount === 1 ? "" : "s"} across {unreadConvCount} chat{unreadConvCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#3B82F6" />
                  </Pressable>
                ) : null}
              </>
            )}

            {/* ── Nearby alert settings ─────────────────────────────── */}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
            <Text style={{ fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7, color: colors.mutedForeground }}>Nearby alert settings</Text>
            <View style={{ backgroundColor: colors.navy, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                  {notificationSettings.enabled ? "Nearby advert alerts are on" : "Turn on nearby advert alerts"}
                </Text>
                <Text style={{ color: "#BFD4CD", fontWeight: "500", fontSize: 12, marginTop: 3 }}>
                  {nearCount} advert{nearCount === 1 ? "" : "s"} within {notificationSettings.radiusKm} km of {notificationSettings.locationLabel}
                </Text>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={onToggleNotifications}
                trackColor={{ false: "#3E554E", true: colors.primary }}
                thumbColor={notificationSettings.enabled ? colors.accent : "#FFFFFF"}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[10, 25, 50].map((radius) => (
                <Pill key={radius} label={`${radius} km`} active={notificationSettings.radiusKm === radius} onPress={() => onSetRadius(radius)} />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adverts, conversations, notificationSettings, toggleNotifications, setNotificationRadius, approvedSports, selectedSport, setSelectedSport, requestSport, currentAccount, isAdmin, accounts, showMemberStats, showSportRequestField } = useSportsConnect();
  const [filter, setFilter] = useState<Filter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [stateFilter, setStateFilter] = useState<AustralianStateFilter>("All");
  const [selected, setSelected] = useState<Advert | null>(null);
  const [sportRequest, setSportRequest] = useState("");
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const activeTheme = selectedSport === allSportsFilterName ? null : getSportTheme(selectedSport, approvedSports);

  // Pending connection requests on adverts the current user owns.
  const pendingConvs = useMemo(
    () => conversations.filter((c) => c.status === "pending" && c.ownerAccountId === currentAccount?.id),
    [conversations, currentAccount]
  );

  // Conversations with unread messages that involve the current user.
  const unreadConvCount = useMemo(
    () => conversations.filter(
      (c) => !!c.hasUnread && (c.ownerAccountId === currentAccount?.id || c.initiatorAccountId === currentAccount?.id)
    ).length,
    [conversations, currentAccount]
  );

  const totalBadgeCount = pendingConvs.length + unreadConvCount;

  const profileSports = currentAccount?.sports ?? [];
  const visibleSportChips = approvedSports.filter(
    (s) => profileSports.length === 0 || profileSports.includes(s.name)
  );

  useEffect(() => {
    if (
      selectedSport !== allSportsFilterName &&
      !profileSports.includes(selectedSport)
    ) {
      setSelectedSport(allSportsFilterName);
    }
  }, [profileSports, selectedSport, setSelectedSport]);

  const connectableTypes = getConnectableAdvertTypes(currentAccount?.role ?? "player", currentAccount?.affiliatedClubId ?? null);

  useEffect(() => {
    if (filter !== "all" && filter !== "near" && filter !== "expiring-soon" && !isAdmin && !connectableTypes.includes(filter)) {
      setFilter("all");
    }
  }, [filter, connectableTypes, isAdmin]);

  const filtered = useMemo(() => {
    const base = adverts.filter((advert) => {
      if (!isAdmin && advert.status === "closed") return false;
      const matchesSport = selectedSport === allSportsFilterName
        ? (profileSports.length === 0 || profileSports.includes(advert.sport))
        : advert.sport === selectedSport;
      if (!matchesSport) return false;
      const matchesState = stateFilter === "All" || advert.location.includes(stateFilter);
      if (!matchesState) return false;
      if (filter === "near") return advert.distanceKm <= notificationSettings.radiusKm;
      if (filter === "expiring-soon") {
        const expiry = getExpiryInfo(advert);
        return !expiry.expired && expiry.expiringSoon;
      }
      if (filter === "all") {
        if (isAdmin) return true;
        return connectableTypes.includes(advert.type as Filter);
      }
      return advert.type === filter;
    });
    // Sort newest-first by default, oldest-first when toggled.
    return [...base].sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });
  }, [adverts, filter, sortOrder, notificationSettings.radiusKm, selectedSport, stateFilter, isAdmin, profileSports, connectableTypes]);

  const nearCount = adverts.filter((advert) => advert.distanceKm <= notificationSettings.radiusKm).length;

  const submitSportRequest = () => {
    if (containsProfanity(sportRequest)) {
      Alert.alert("Inappropriate language", "Please remove inappropriate language from the sport name.");
      return;
    }
    requestSport(sportRequest);
    setSportRequest("");
  };

  const isClubLocked = currentAccount?.role === "club" && currentAccount?.clubApprovalStatus !== "approved";
  const clubLockStatus = currentAccount?.clubApprovalStatus ?? "pending";

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
              ? "Your club application was not approved. You cannot browse or interact with adverts. Please contact support for more information."
              : "Your club account is awaiting admin approval. You will be able to view adverts and connect with players once an admin approves your club.\n\nVisit your Profile tab to check your approval status."}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 116 }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>Aussie Sports Club Finder</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Find your Next Club, Coach or Player</Text>
          </View>
          <Pressable onPress={() => setNotifPanelOpen(true)} style={{ position: "relative", width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Feather name="bell" size={22} color={colors.foreground} />
            {totalBadgeCount > 0 ? (
              <View style={{ position: "absolute", top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 10 }}>{totalBadgeCount > 9 ? "9+" : totalBadgeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={[styles.sportPanel, { backgroundColor: activeTheme?.background ?? colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
          <View style={styles.sportPanelHeader}>
            <View>
              <Text style={[styles.sportKicker, { color: activeTheme?.primary ?? colors.primary }]}>Sports filter</Text>
              <Text style={[styles.sportTitle, { color: activeTheme?.text ?? colors.foreground }]}>{selectedSport === allSportsFilterName ? "All sports" : selectedSport}</Text>
            </View>
            <View style={[styles.sportCountBadge, { backgroundColor: activeTheme?.button ?? colors.primary }]}>
              <Text style={styles.sportCountText}>{filtered.length}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportScroll}>
            <Pressable onPress={() => setSelectedSport(allSportsFilterName)} style={({ pressed }) => [styles.sportChip, { backgroundColor: selectedSport === allSportsFilterName ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
              <Text style={[styles.sportChipText, { color: selectedSport === allSportsFilterName ? colors.primaryForeground : colors.secondaryForeground }]}>All Sports</Text>
            </Pressable>
            {visibleSportChips.map((sport) => (
              <Pressable key={sport.name} onPress={() => setSelectedSport(sport.name)} style={({ pressed }) => [styles.sportChip, { backgroundColor: selectedSport === sport.name ? sport.button : sport.soft, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[styles.sportChipText, { color: selectedSport === sport.name ? "#FFFFFF" : sport.text }]}>{sport.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {showSportRequestField && (
            <View style={styles.addSportRow}>
              <TextInput value={sportRequest} onChangeText={setSportRequest} placeholder="Add a sport for admin approval" placeholderTextColor={colors.mutedForeground} style={[styles.addSportInput, { backgroundColor: colors.background, borderColor: activeTheme?.soft ?? colors.border, color: colors.foreground }]} />
              <Pressable onPress={submitSportRequest} style={({ pressed }) => [styles.addSportButton, { backgroundColor: activeTheme?.button ?? colors.primary, opacity: pressed ? 0.75 : 1 }]}>
                <Feather name="plus" color="#FFFFFF" size={18} />
              </Pressable>
            </View>
          )}
        </View>

        {showMemberStats && (
          <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{accounts.filter((a) => a.role === "club").length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Clubs</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{accounts.filter((a) => a.role === "player" || a.role === "guardian").length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Players</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{accounts.filter((a) => a.role === "coach").length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Coaches</Text>
            </View>
          </View>
        )}

        <ImageBackground source={heroImage} imageStyle={styles.heroImage} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Local sport moves fast</Text>
            <Text style={styles.heroText}>Connect with clubs and players nearby, then keep the conversation private once both sides agree.</Text>
          </View>
        </ImageBackground>

        <SectionTitle title={`${selectedSport === allSportsFilterName ? "All sports" : selectedSport} adverts`} action={`${filtered.length} live`} />
        <View style={styles.filterRow}>
          <Pill label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          {(isAdmin ? (["players-wanted", "player-looking", "coach-looking", "coach-wanted", "club-trials", "club-friendly"] as Filter[]) : connectableTypes).map((type) => (
            <Pill
              key={type}
              label={type === "players-wanted" ? "Players Wanted" : type === "player-looking" ? "Player Looking" : type === "coach-looking" ? "Coach Looking" : type === "coach-wanted" ? "Coach Wanted" : type === "club-friendly" ? "Club Friendly" : "Club Trials"}
              active={filter === type}
              onPress={() => setFilter(type)}
            />
          ))}
          <Pill label="Near me" active={filter === "near"} onPress={() => setFilter("near")} />
          <Pill label="⏳ Expiring soon" active={filter === "expiring-soon"} onPress={() => setFilter("expiring-soon")} />
        </View>
        <View style={[styles.filterRow, { marginTop: -6 }]}>
          <Pill
            label={sortOrder === "newest" ? "Oldest first" : "Newest first"}
            active={false}
            onPress={() => setSortOrder((s) => s === "newest" ? "oldest" : "newest")}
          />
        </View>

        <View style={styles.stateBlock}>
          <Text style={[styles.stateLabel, { color: colors.mutedForeground }]}>Australian state</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateScroll}>
            {australianStates.map((state) => (
              <Pill key={state} label={state} active={stateFilter === state} onPress={() => setStateFilter(state)} />
            ))}
          </ScrollView>
        </View>

        <FlatList data={filtered} scrollEnabled={false} keyExtractor={(item) => item.id} renderItem={({ item }) => <AdvertCard advert={item} onPress={() => setSelected(item)} />} />
        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
            <Feather name="search" color={activeTheme?.primary ?? colors.primary} size={24} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No adverts in this sport yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try another sport or post the first advert for this category.</Text>
          </View>
        ) : null}
      </ScrollView>
      <NotificationPanel
        open={notifPanelOpen}
        onClose={() => setNotifPanelOpen(false)}
        nearCount={nearCount}
        pendingConvs={pendingConvs}
        unreadConvCount={unreadConvCount}
        notificationSettings={notificationSettings}
        onToggleNotifications={toggleNotifications}
        onSetRadius={setNotificationRadius}
        onGoToMessages={() => { setNotifPanelOpen(false); router.push("/(tabs)/messages"); }}
        onGoToDiscover={() => setNotifPanelOpen(false)}
        onSelectAdvert={(advertId) => {
          const advert = adverts.find((a) => a.id === advertId);
          if (advert) { setNotifPanelOpen(false); setSelected(advert); }
        }}
      />
      {selected ? <AdvertDetail advert={selected} onClose={() => setSelected(null)} /> : null}
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
  content: { paddingHorizontal: 20, gap: 18 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 34, lineHeight: 38, letterSpacing: -1, maxWidth: 290, marginTop: 4 },
  statsBar: { ...subtleShadow, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 12, marginTop: 4 },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statValue: { fontWeight: "800", fontSize: 22, letterSpacing: -0.5 },
  statLabel: { fontWeight: "600", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, opacity: 0.6 },
  hero: { height: 178, borderRadius: 30, overflow: "hidden", justifyContent: "flex-end" },
  heroImage: { borderRadius: 30 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,24,22,0.45)" },
  heroContent: { padding: 20 },
  heroTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 24, letterSpacing: -0.3 },
  heroText: { color: "#E7F4EF", fontWeight: "500", fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 300 },
  sportPanel: { ...subtleShadow, borderWidth: 1, borderRadius: 28, padding: 16, gap: 12 },
  sportPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sportKicker: { fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  sportTitle: { fontWeight: "800", fontSize: 23, letterSpacing: -0.5, marginTop: 2 },
  sportCountBadge: { minWidth: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sportCountText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  sportScroll: { paddingRight: 20, gap: 8 },
  sportChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  sportChipText: { fontWeight: "800", fontSize: 13 },
  addSportRow: { flexDirection: "row", gap: 8 },
  addSportInput: { flex: 1, borderWidth: 1, borderRadius: 16, minHeight: 46, paddingHorizontal: 14, fontWeight: "600", fontSize: 14 },
  addSportButton: { width: 48, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  alertCard: { ...subtleShadow, borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  alertTextWrap: { flex: 1 },
  alertTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 17 },
  alertText: { color: "#BFD4CD", fontWeight: "500", fontSize: 13, lineHeight: 19, marginTop: 4 },
  radiusRow: { flexDirection: "row" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stateBlock: { gap: 8 },
  stateLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 },
  stateScroll: { paddingRight: 20 },
  goldBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FEF9C3", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FDE68A" },
  adCard: { ...subtleShadow, borderWidth: 1, borderRadius: 26, padding: 14, marginBottom: 12, flexDirection: "row", gap: 13 },
  adIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  adBody: { flex: 1 },
  adMetaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  adMeta: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  adDistance: { fontWeight: "700", fontSize: 12 },
  adTitle: { fontWeight: "700", fontSize: 17, lineHeight: 22 },
  adText: { fontWeight: "500", fontSize: 13 },
  adExpiry: { fontWeight: "600", fontSize: 11, marginTop: 5 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: "92%", overflow: "hidden" },
  expiryBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  expiryBarText: { fontWeight: "700", fontSize: 13 },
  modalScroll: { paddingHorizontal: 22, paddingBottom: 34, gap: 4 },
  modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16 },
  modalIcon: { width: 54, height: 54, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  detailType: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8 },
  detailTitle: { fontWeight: "700", fontSize: 27, lineHeight: 32, letterSpacing: -0.6 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  detailChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  detailChipText: { fontWeight: "700", fontSize: 12 },
  detailRow: { gap: 4, marginTop: 10 },
  detailLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 },
  detailCopy: { fontWeight: "600", fontSize: 15, lineHeight: 21 },
  hiddenRow: { gap: 6 },
  hiddenBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  hiddenBadgeText: { fontWeight: "600", fontSize: 11 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontWeight: "600", fontSize: 12 },
  connectedBadge: { ...subtleShadow, flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 18 },
  pendingCountText: { fontWeight: "700", fontSize: 14, marginBottom: 8 },
  pendingRequestCard: { ...subtleShadow, borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 14 },
  pendingRequestText: { fontWeight: "600", fontSize: 14, lineHeight: 20 },
  acceptDenyRow: { flexDirection: "row", gap: 12 },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#22C55E", borderRadius: 14, paddingVertical: 12 },
  denyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 12 },
  acceptDenyBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  connectedText: { fontWeight: "600", fontSize: 14, flex: 1 },
  emptyState: { ...subtleShadow, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", gap: 8 },
  emptyTitle: { fontWeight: "800", fontSize: 17 },
  emptyText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
