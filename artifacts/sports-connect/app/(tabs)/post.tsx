import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Pill, PrimaryButton, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { Advert, AccountRole, useSportsConnect } from "@/context/SportsConnectContext";
import { getSportTheme } from "@/constants/sports";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { ApiError } from "@/utils/apiClient";
import SubscriptionPaywall from "@/components/SubscriptionPaywall";

type AgeGroup = { label: string; min: number; max: number };
type TrialSlot = { date: string; timeFrom: string; timeTo: string };

const COACH_ROLES = ["Head Coach", "Assistant Coach", "Trainer", "Technical Director"];
const COACH_EXPERIENCE_LEVELS = [
  { value: "Level 1", label: "Beginner / Trainee / Community / Non-Competitive (Level 1)" },
  { value: "Level 2", label: "Development Focused (Level 2)" },
  { value: "Level 3", label: "Performance / Club Pro / Competitive (Level 3)" },
  { value: "Level 4", label: "High Performance / Senior (Level 4)" },
];
const COACH_POSITION_TYPES = ["Paid Full-time", "Paid Part-time", "One off payment", "Unpaid Volunteer"];
const FOCUS_AREAS = ["Club", "Junior Development", "Senior", "Women's Program"];
const AGE_GROUPS: AgeGroup[] = [
  { label: "Tiny Tots / Minis (Ages 3–6)", min: 3, max: 6 },
  { label: "Junior (Ages 7–11)", min: 7, max: 11 },
  { label: "Intermediate / Youth (Ages 12–15)", min: 12, max: 15 },
  { label: "Senior Youth (Ages 16–20)", min: 16, max: 20 },
  { label: "Senior (Ages 21+)", min: 21, max: 50 },
];
const TEAM_GENDERS = ["Female", "Male", "Mixed"];
const PLAYER_GENDERS = ["Male", "Female"];

function agesInGroup(group: AgeGroup) {
  return Array.from({ length: group.max - group.min + 1 }, (_, i) => group.min + i);
}


const advertTypesByRole: Record<AccountRole, { value: Advert["type"]; label: string; requiresAffiliation?: boolean }[]> = {
  player: [{ value: "player-looking", label: "Player looking for Club" }],
  guardian: [{ value: "player-looking", label: "Parent/Guardian's Player Looking for a Club" }],
  coach: [
    { value: "coach-looking", label: "Coach looking for Team or Club" },
    { value: "players-wanted", label: "Players Wanted for Team", requiresAffiliation: true },
    { value: "club-trials", label: "Club Trials Info", requiresAffiliation: true },
  ],
  club: [
    { value: "players-wanted", label: "Players Wanted for Team" },
    { value: "club-trials", label: "Club Trials Info" },
    { value: "coach-wanted", label: "Staff (Coach/TD) Wanted for Club" },
  ],
};

const coachTitles = ["Senior", "Assistant", "Amateur", "Experienced", "Inexperienced", "Intermediate", "Professional"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
function stripStateFromLocation(location: string): string {
  const parts = location.trim().split(" ");
  const last = parts[parts.length - 1]?.toUpperCase();
  return AU_STATES.includes(last) ? parts.slice(0, -1).join(" ").trim() : location.trim();
}
function stateFromLocation(location: string): string {
  const parts = location.trim().split(" ");
  const last = parts[parts.length - 1]?.toUpperCase();
  return AU_STATES.includes(last) ? last : "";
}

function FormLabel({ text, required }: { text: string; required?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 14, marginBottom: 4 }}>
      <Text style={[localStyles.formLabel, { color: colors.mutedForeground }]}>{text}</Text>
      {required ? <Text style={{ color: "#D9534F", fontWeight: "700", fontSize: 12 }}>*</Text> : null}
    </View>
  );
}

function CheckRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onToggle} style={localStyles.checkRow}>
      <View style={[localStyles.checkBox, { borderColor: colors.primary, backgroundColor: value ? colors.primary : "transparent" }]}>
        {value ? <Feather name="check" color="#FFFFFF" size={13} /> : null}
      </View>
      <Text style={[localStyles.checkLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function DayPicker({ label, selected, onToggle, tbd, onTbdToggle }: { label: string; selected: string[]; onToggle: (d: string) => void; tbd: boolean; onTbdToggle: () => void; }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <FormLabel text={label} required />
      <CheckRow label="TBD (to be decided)" value={tbd} onToggle={onTbdToggle} />
      <View style={[localStyles.dayRow, tbd && { opacity: 0.35 }]}>
        {DAYS.map((d) => (
          <Pressable
            key={d}
            disabled={tbd}
            onPress={() => onToggle(d)}
            style={[localStyles.dayChip, { backgroundColor: selected.includes(d) ? colors.primary : colors.secondary }]}
          >
            <Text style={[localStyles.dayChipText, { color: selected.includes(d) ? "#FFF" : colors.secondaryForeground }]}>{d}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TimeRow({ label, from, to, onFromChange, onToChange, disabled }: { label: string; from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void; disabled?: boolean; }) {
  const colors = useColors();
  return (
    <View style={[{ gap: 6 }, disabled && { opacity: 0.35 }]}>
      <FormLabel text={label} required />
      <View style={localStyles.timeRowInner}>
        <View style={{ flex: 1 }}>
          <Text style={[localStyles.timeSubLabel, { color: colors.mutedForeground }]}>FROM</Text>
          <TextInput editable={!disabled} value={from} onChangeText={onFromChange} placeholder="e.g. 6:00 PM" placeholderTextColor={colors.mutedForeground} style={[localStyles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[localStyles.timeSubLabel, { color: colors.mutedForeground }]}>TO</Text>
          <TextInput editable={!disabled} value={to} onChangeText={onToChange} placeholder="e.g. 8:00 PM" placeholderTextColor={colors.mutedForeground} style={[localStyles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
        </View>
      </View>
    </View>
  );
}

const FREE_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000;
const PAID_LIFESPAN_MS = 14 * 24 * 60 * 60 * 1000;

function getExpiryInfo(advert: Pick<Advert, "createdAt" | "ownerSubscriptionStatus">) {
  const lifespanMs = advert.ownerSubscriptionStatus === "active" ? PAID_LIFESPAN_MS : FREE_LIFESPAN_MS;
  const expiresAt = new Date(advert.createdAt).getTime() + lifespanMs;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return { expired: true, label: "Expired", days: 0, hours: 0, mins: 0 };
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return { expired: false, label: `${days}d ${hours}h ${mins}m remaining`, days, hours, mins };
}

function advertTypeLabel(type: Advert["type"]) {
  return type === "players-wanted" ? "Players Wanted for Team"
    : type === "player-looking" ? "Player Looking for Club"
    : type === "coach-looking" ? "Coach Looking for Team/Club"
    : type === "coach-wanted" ? "Staff (Coach/TD) Wanted for Club"
    : type === "club-trials" ? "Club Trials Info"
    : "Players Wanted for Team";
}

function MyAdvertCard({ advert, onPress }: { advert: Advert; onPress: () => void }) {
  const colors = useColors();
  const { approvedSports } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  const expiry = getExpiryInfo(advert);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [localStyles.myCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}>
      {advert.possibleDuplicate ? (
        <View style={[localStyles.expiryRow, { backgroundColor: "#FFFBEB", marginBottom: 4 }]}>
          <Feather name="alert-triangle" size={12} color="#D97706" />
          <Text style={[localStyles.expiryText, { color: "#92400E" }]}>Flagged for admin review — possible duplicate</Text>
        </View>
      ) : null}
      <View style={[localStyles.expiryRow, { backgroundColor: expiry.expired ? "#FDECEA" : colors.pitchSoft }]}>
        <Feather name="clock" size={12} color={expiry.expired ? "#D9534F" : colors.primary} />
        <Text style={[localStyles.expiryText, { color: expiry.expired ? "#D9534F" : colors.primary }]}>
          {expiry.expired ? "Expired" : expiry.label}
        </Text>
      </View>
      <View style={localStyles.cardTop}>
        <Text style={[localStyles.cardType, { color: theme.primary }]}>{advertTypeLabel(advert.type)}</Text>
        <Text style={[localStyles.cardDistance, { color: colors.mutedForeground }]}>{advert.distanceKm} km</Text>
      </View>
      <Text style={[localStyles.cardTitle, { color: colors.foreground }]}>{advert.title}</Text>
      <Text style={[localStyles.cardText, { color: colors.mutedForeground }]}>{advert.sport} · {advert.location}</Text>
      {advert.focusArea ? <Text style={[localStyles.cardText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.focusArea}</Text> : advert.ageGroup ? <Text style={[localStyles.cardText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.ageGroup}</Text> : null}
      <View style={localStyles.cardFooter}>
        <Feather name="eye" size={13} color={colors.mutedForeground} />
        <Text style={[localStyles.cardFooterText, { color: colors.mutedForeground }]}>Tap to view, edit or delete</Text>
      </View>
    </Pressable>
  );
}

function MyAdvertDetail({
  advert,
  onClose,
  onEdit,
}: {
  advert: Advert;
  onClose: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
  const { approvedSports, deleteAdvert, currentAccount } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  const expiry = getExpiryInfo(advert);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isPaidPlayerCoach =
    currentAccount?.subscriptionStatus === "active" &&
    currentAccount?.role !== "club";

  const cooldownUnlockTime = (() => {
    if (!isPaidPlayerCoach) return null;
    const unlockDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
    return `${unlockDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} on ${unlockDate.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`;
  })();

  const trainingSchedule = (() => {
    if (!advert.trainingDays?.length && !advert.trainingTbd) return null;
    if (advert.trainingTbd) return "TBD";
    const days = (advert.trainingDays ?? []).join(", ");
    const times = [advert.trainingTimeFrom, advert.trainingTimeTo].filter(Boolean).join(" – ");
    return [days, times].filter(Boolean).join("  |  ");
  })();

  const gameSchedule = (() => {
    if (!advert.gameDays?.length && !advert.gameTbd) return null;
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

  const confirmDelete = () => {
    const id = advert.id;
    deleteAdvert(id);
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={localStyles.modalScrim}>
        <View style={[localStyles.modalCard, { backgroundColor: colors.background }]}>
          <View style={[localStyles.detailExpiryBar, { backgroundColor: expiry.expired ? "#FDECEA" : colors.pitchSoft }]}>
            <Feather name="clock" color={expiry.expired ? "#D9534F" : colors.primary} size={14} />
            <Text style={[localStyles.detailExpiryText, { color: expiry.expired ? "#D9534F" : colors.primary }]}>
              {expiry.expired ? "This advert has expired" : `Expires in ${expiry.label}`}
            </Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: "auto" })}>
              <Feather name="x" color={colors.mutedForeground} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={localStyles.detailScroll}>
            <Text style={[localStyles.detailTypeLabel, { color: theme.primary }]}>{advertTypeLabel(advert.type)}</Text>
            <Text style={[localStyles.detailTitle, { color: colors.foreground }]}>{advert.title}</Text>

            <View style={localStyles.detailChips}>
              <View style={[localStyles.chip, { backgroundColor: theme.soft }]}><Text style={[localStyles.chipText, { color: theme.primary }]}>{advert.sport}</Text></View>
              {advert.level ? <View style={[localStyles.chip, { backgroundColor: colors.secondary }]}><Text style={[localStyles.chipText, { color: colors.secondaryForeground }]}>{advert.level}</Text></View> : null}
              {advert.teamGender ? <View style={[localStyles.chip, { backgroundColor: colors.secondary }]}><Text style={[localStyles.chipText, { color: colors.secondaryForeground }]}>{advert.teamGender}</Text></View> : null}
              {advert.playerGender ? <View style={[localStyles.chip, { backgroundColor: colors.secondary }]}><Text style={[localStyles.chipText, { color: colors.secondaryForeground }]}>{advert.playerGender}</Text></View> : null}
              {advert.focusArea ? <View style={[localStyles.chip, { backgroundColor: colors.secondary }]}><Text style={[localStyles.chipText, { color: colors.secondaryForeground }]}>{advert.focusArea}</Text></View> : null}
              {advert.ageGroup ? <View style={[localStyles.chip, { backgroundColor: colors.secondary }]}><Text style={[localStyles.chipText, { color: colors.secondaryForeground }]}>{advert.ageGroup}</Text></View> : null}
              {advert.preferredAge ? <View style={[localStyles.chip, { backgroundColor: colors.secondary }]}><Text style={[localStyles.chipText, { color: colors.secondaryForeground }]}>Age {advert.preferredAge}</Text></View> : null}
              {advert.trialRequired ? <View style={[localStyles.chip, { backgroundColor: colors.amberSoft }]}><Text style={[localStyles.chipText, { color: colors.accentForeground }]}>Trial required</Text></View> : null}
              {feesLabel ? <View style={[localStyles.chip, { backgroundColor: colors.pitchSoft }]}><Text style={[localStyles.chipText, { color: colors.primary }]}>{feesLabel}</Text></View> : null}
            </View>

            {advert.positions && advert.positions.length > 0 ? (
              <View style={localStyles.detailSection}>
                <Text style={[localStyles.detailLabel, { color: colors.mutedForeground }]}>Position(s)</Text>
                <View style={localStyles.tagRow}>
                  {advert.positions.map((p) => (
                    <View key={p} style={[localStyles.tag, { backgroundColor: theme.soft }]}>
                      <Text style={[localStyles.tagText, { color: theme.primary }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={localStyles.detailSection}>
              <Text style={[localStyles.detailLabel, { color: colors.mutedForeground }]}>Location</Text>
              <Text style={[localStyles.detailValue, { color: colors.foreground }]}>{advert.location}</Text>
            </View>

            {advert.playerDescription ? (
              <View style={localStyles.detailSection}>
                <Text style={[localStyles.detailLabel, { color: colors.mutedForeground }]}>
                  {advert.postedByType === "club" ? "Looking for" : "About the player"}
                </Text>
                <Text style={[localStyles.detailValue, { color: colors.foreground }]}>{advert.playerDescription}</Text>
              </View>
            ) : null}

            {trainingSchedule ? (
              <View style={localStyles.detailSection}>
                <Text style={[localStyles.detailLabel, { color: colors.mutedForeground }]}>Training</Text>
                <Text style={[localStyles.detailValue, { color: colors.foreground }]}>{trainingSchedule}</Text>
              </View>
            ) : null}

            {gameSchedule ? (
              <View style={localStyles.detailSection}>
                <Text style={[localStyles.detailLabel, { color: colors.mutedForeground }]}>Games</Text>
                <Text style={[localStyles.detailValue, { color: colors.foreground }]}>{gameSchedule}</Text>
              </View>
            ) : null}

            {advert.description ? (
              <View style={localStyles.detailSection}>
                <Text style={[localStyles.detailLabel, { color: colors.mutedForeground }]}>Additional details</Text>
                <Text style={[localStyles.detailValue, { color: colors.foreground }]}>{advert.description}</Text>
              </View>
            ) : null}

            <View style={{ height: 20 }} />

            <Pressable onPress={onEdit} style={({ pressed }) => [localStyles.editButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
              <Feather name="edit-2" color="#FFFFFF" size={16} />
              <Text style={localStyles.editButtonText}>Edit Advert</Text>
            </Pressable>

            {confirmingDelete ? (
              <View style={[localStyles.deleteConfirmBox, { backgroundColor: "#FEF2F2", borderColor: "#D9534F" }]}>
                {cooldownUnlockTime ? (
                  <View style={{ backgroundColor: "#FFFBEB", borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A", padding: 10, marginBottom: 8, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Feather name="clock" size={15} color="#D97706" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>72-hour posting cooldown starts now</Text>
                      <Text style={{ fontSize: 12, color: "#78350F", lineHeight: 17 }}>
                        Deleting starts a 72-hour cooldown. You won't be able to post again until {cooldownUnlockTime}.
                      </Text>
                    </View>
                  </View>
                ) : null}
                <Text style={localStyles.deleteConfirmText}>This cannot be undone. Permanently delete this advert?</Text>
                <View style={localStyles.deleteConfirmRow}>
                  <Pressable onPress={() => setConfirmingDelete(false)} style={({ pressed }) => [localStyles.deleteConfirmCancel, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={[localStyles.deleteConfirmCancelText, { color: colors.secondaryForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={confirmDelete} style={({ pressed }) => [localStyles.deleteConfirmYes, { opacity: pressed ? 0.8 : 1 }]}>
                    <Feather name="trash-2" color="#FFFFFF" size={15} />
                    <Text style={localStyles.deleteConfirmYesText}>Yes, Delete</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmingDelete(true)} style={({ pressed }) => [localStyles.deleteButton, { borderColor: "#D9534F", opacity: pressed ? 0.8 : 1 }]}>
                <Feather name="trash-2" color="#D9534F" size={16} />
                <Text style={[localStyles.deleteButtonText, { color: "#D9534F" }]}>Delete Advert</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function PostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { createAdvert, updateAdvert, adverts, activeProfile, clubProfile, playerProfile, approvedSports, sportsRegistry, selectedSport, setSelectedSport, currentAccount } = useSportsConnect();
  const { isSubscribed } = useSubscription();
  const accountRole = currentAccount?.role ?? activeProfile;

  // Live ticker so the cooldown lock re-evaluates automatically when time passes.
  // Updated every 30 s and on tab focus, so the Post tab unlocks without a restart.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
      const id = setInterval(() => setNowMs(Date.now()), 30_000);
      return () => clearInterval(id);
    }, [])
  );
  const repostCooldownUntil = (() => {
    if (!currentAccount?.lastAdvertClosedAt) return null;
    if (currentAccount.role === "club") return null;
    if (currentAccount.subscriptionStatus !== "active") return null;
    const end = new Date(new Date(currentAccount.lastAdvertClosedAt).getTime() + 72 * 60 * 60 * 1000);
    return end.getTime() > nowMs ? end.toISOString() : null;
  })();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallHint, setPaywallHint] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Server-returned duplicate / cooldown error
  type DuplicateErrorState =
    | { code: "DUPLICATE_ACTIVE"; existingAdvertId: string; message: string }
    | { code: "REPOST_COOLDOWN"; repostAvailableAt: string; message: string }
    | { code: "PLAYER_COOLDOWN"; repostAvailableAt: string; message: string };
  const [duplicateError, setDuplicateError] = useState<DuplicateErrorState | null>(null);
  // Client-side similarity warning before submit
  const [similarityWarning, setSimilarityWarning] = useState<{ draft: Parameters<typeof createAdvert>[0] } | null>(null);

  const rawAllowedSports: string[] = activeProfile === "club"
    ? [currentAccount?.defaultSport || clubProfile.sport].filter(Boolean)
    : (currentAccount?.sports?.length ? currentAccount.sports : [playerProfile.sports.split(", ")[0] || selectedSport]).filter(Boolean);

  // Intersect account sports with the enabled registry so disabled sports are never postable
  const allowedSports = rawAllowedSports.length
    ? approvedSports.filter((s) => rawAllowedSports.includes(s.name)).map((s) => s.name)
    : approvedSports.map((s) => s.name);

  const [selectedMyAdvert, setSelectedMyAdvert] = useState<Advert | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [type, setType] = useState<Advert["type"]>(advertTypesByRole[accountRole][0].value);
  const [sport, setSport] = useState(currentAccount?.defaultSport || allowedSports[0] || selectedSport);
  const [suburb, setSuburb] = useState(() => stripStateFromLocation(currentAccount?.location ?? playerProfile.location));
  const [state, setState] = useState(() => stateFromLocation(currentAccount?.location ?? ""));
  const [level, setLevel] = useState("Competitive amateur");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [preferredAge, setPreferredAge] = useState<number | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
  const [coachTitle, setCoachTitle] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [trainingFrom, setTrainingFrom] = useState("");
  const [trainingTo, setTrainingTo] = useState("");
  const [trainingTbd, setTrainingTbd] = useState(false);
  const [gameDays, setGameDays] = useState<string[]>([]);
  const [gameFrom, setGameFrom] = useState("");
  const [gameTo, setGameTo] = useState("");
  const [gameTbd, setGameTbd] = useState(false);
  const [feesFree, setFeesFree] = useState(false);
  const [feesNegotiable, setFeesNegotiable] = useState(false);
  const [seasonFeesText, setSeasonFeesText] = useState("");
  const [trialRequired, setTrialRequired] = useState(false);
  const [scheduleNote, setScheduleNote] = useState("");
  const [trialSlots, setTrialSlots] = useState<TrialSlot[]>([{ date: "", timeFrom: "", timeTo: "" }]);
  const [coachRole, setCoachRole] = useState("Head Coach");
  const [focusArea, setFocusArea] = useState("");
  const [coachExperienceLevel, setCoachExperienceLevel] = useState("");
  const [coachPositionTypes, setCoachPositionTypes] = useState<string[]>([]);
  const [coachSalaryText, setCoachSalaryText] = useState("");
  const [coachSalaryTbc, setCoachSalaryTbc] = useState(false);
  const [teamGender, setTeamGender] = useState<string>("");
  const [playerGender, setPlayerGender] = useState<string>("");
  const [title, setTitle] = useState("");

  const allowedSportsKey = allowedSports.join(",");
  useEffect(() => {
    const nextSport = (currentAccount?.defaultSport && allowedSports.includes(currentAccount.defaultSport) ? currentAccount.defaultSport : undefined) ?? allowedSports[0] ?? "";
    setSport((current) => (allowedSports.includes(current) ? current : nextSport));
    setPositions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedSportsKey, currentAccount?.defaultSport, selectedSport]);

  useEffect(() => {
    const loc = currentAccount?.location ?? "";
    setSuburb(stripStateFromLocation(loc));
    setState(stateFromLocation(loc));
  }, [currentAccount?.id]);

  useEffect(() => {
    const nextType = advertTypesByRole[activeProfile][0].value;
    setType(nextType);
  }, [activeProfile]);

  useEffect(() => {
    const nextType = advertTypesByRole[accountRole][0].value;
    setType(nextType);
  }, [accountRole]);

  useEffect(() => {
    if (editingId) return;
    const nextSport = currentAccount?.defaultSport || allowedSports[0] || selectedSport;
    setSport(nextSport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.defaultSport, allowedSportsKey, selectedSport, editingId]);

  useEffect(() => {
    const sportLabel = sport.includes(" (") ? sport.split(" (")[0] : sport;
    const ageLabel = ageGroup ? ageGroup.label.replace(/\(.*\)/, "").trim() : "";
    const isClubSide = type === "players-wanted" || type === "club-trials" || type === "coach-wanted";
    const genderLabel = isClubSide ? teamGender.trim() : playerGender.trim();
    const positionLabel = positions.length === 1 ? positions[0] : "";

    let middleSlot = "";
    let rolePhrase = "";
    if (type === "players-wanted") {
      middleSlot = positionLabel;
      rolePhrase = "Players Wanted by Club";
    } else if (type === "club-trials") {
      middleSlot = positionLabel;
      rolePhrase = "Player Trials by Club";
    } else if (type === "coach-wanted") {
      middleSlot = coachRole.trim();
      rolePhrase = "Wanted for Club";
    } else if (type === "player-looking") {
      middleSlot = positionLabel;
      rolePhrase = "Player Looking for Club";
    } else if (type === "coach-looking") {
      middleSlot = coachTitle.trim();
      rolePhrase = "Coach Looking for Club";
    }

    const locationLabel = suburb.trim();
    const ending = locationLabel ? `in ${[locationLabel, state].filter(Boolean).join(" ")}` : "";
    const isTechnicalDirector = isCoachWanted && coachRole === "Technical Director";
    const parts = isTechnicalDirector
      ? [genderLabel, sportLabel, focusArea, level, middleSlot, rolePhrase].filter(Boolean)
      : [genderLabel, ageLabel, level, middleSlot, sportLabel, rolePhrase].filter(Boolean);
    const titleBody = parts.join(" ").replace(/\s+/g, " ").trim();
    setTitle([titleBody, ending].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
  }, [sport, type, ageGroup, focusArea, coachTitle, coachRole, positions, suburb, state, teamGender, playerGender, level]);

  const loadAdvertForEdit = (advert: Advert) => {
    setEditingId(advert.id);
    setType(advert.type);
    setSport(advert.sport);
    setLevel(advert.level || "Competitive amateur");
    setDescription(advert.description || "");
    setPlayerDescription(advert.playerDescription || "");
    const foundGroup = AGE_GROUPS.find((g) => g.label === advert.ageGroup) ?? null;
    setAgeGroup(foundGroup);
    setPreferredAge(advert.preferredAge ?? null);
    setPositions(advert.positions ?? []);
    setCoachTitle("");
    setTrainingDays(advert.trainingDays ?? []);
    setTrainingFrom(advert.trainingTimeFrom ?? "");
    setTrainingTo(advert.trainingTimeTo ?? "");
    setTrainingTbd(advert.trainingTbd ?? false);
    setGameDays(advert.gameDays ?? []);
    setGameFrom(advert.gameTimeFrom ?? "");
    setGameTo(advert.gameTimeTo ?? "");
    setGameTbd(advert.gameTbd ?? false);
    setFeesFree(advert.feesFree ?? false);
    setFeesNegotiable(advert.feesNegotiable ?? false);
    setSeasonFeesText(advert.seasonFees ? String(advert.seasonFees) : "");
    setTrialRequired(advert.trialRequired ?? false);
    setScheduleNote(advert.scheduleNote || "");
    setTrialSlots(advert.trialSlots?.length ? advert.trialSlots : [{ date: "", timeFrom: "", timeTo: "" }]);
    setCoachRole(advert.coachRole || "");
    setFocusArea(advert.focusArea || "");
    setCoachExperienceLevel(advert.coachExperienceLevel || "");
    setCoachPositionTypes(advert.coachPositionTypes ?? []);
    setCoachSalaryText(advert.coachSalary ? String(advert.coachSalary) : "");
    setCoachSalaryTbc(advert.coachSalaryTbc ?? false);
    setTeamGender(advert.teamGender ?? "");
    setPlayerGender(advert.playerGender ?? "");
    setSubmitted(false);
    setSelectedMyAdvert(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDescription("");
    setPlayerDescription("");
    setAgeGroup(null);
    setPreferredAge(null);
    setPositions([]);
    setCoachTitle("");
    setTrainingDays([]);
    setTrainingFrom("");
    setTrainingTo("");
    setTrainingTbd(false);
    setGameDays([]);
    setGameFrom("");
    setGameTo("");
    setGameTbd(false);
    setFeesFree(false);
    setFeesNegotiable(false);
    setSeasonFeesText("");
    setTrialRequired(false);
    setScheduleNote("");
    setTrialSlots([{ date: "", timeFrom: "", timeTo: "" }]);
    setCoachRole("Head Coach");
    setCoachExperienceLevel("");
    setCoachPositionTypes([]);
    setCoachSalaryText("");
    setCoachSalaryTbc(false);
    setTeamGender("");
    setPlayerGender("");
    setSubmitted(false);
    setShowErrors(false);
  };

  const isCoach = accountRole === "coach";
  const isAffiliatedCoach = isCoach && Boolean(currentAccount?.affiliatedClubId);
  const coachClubName = currentAccount?.affiliatedClubName;
  const ownerName = activeProfile === "club" ? clubProfile.name : playerProfile.name;
  const postedByName = isAffiliatedCoach && (type === "players-wanted" || type === "club-trials")
    ? `${playerProfile.name} (Affiliated Coach \u2013 ${coachClubName})`
    : ownerName;
  const isClub = accountRole === "club";
  const myAdverts = adverts.filter((a) =>
    (a.postedBy === ownerName ||
     a.postedBy === postedByName ||
     (isAffiliatedCoach && a.affiliatedClubId === currentAccount?.affiliatedClubId && a.ownerAccountId === currentAccount?.id) ||
     (isClub && currentAccount?.id && a.affiliatedClubId === currentAccount.id)
    ) && a.status !== "closed"
  );
  const activeTheme = getSportTheme(sport, approvedSports);
  const sportChoices = rawAllowedSports.length ? approvedSports.filter((s) => allowedSports.includes(s.name)) : approvedSports;
  const availableTypes = advertTypesByRole[accountRole].map((item) => {
    const disabled = item.requiresAffiliation && isCoach && !isAffiliatedCoach;
    return { ...item, disabled };
  });
  const positionOptions = sportsRegistry.find((s) => s.name === sport)?.positions ?? ["General Player"];

  const isPlayerLooking = type === "player-looking";
  const isCoachLooking = type === "coach-looking";
  const isPlayersWanted = type === "players-wanted";
  const isClubTrials = type === "club-trials";
  const isCoachWanted = type === "coach-wanted";
  const showPlayerDesc = isPlayerLooking || isCoachLooking;
  const showCoachTitle = isCoachLooking;
  const showSchedule = isPlayerLooking || isPlayersWanted;
  const showClubFees = isPlayersWanted;
  const trainingDaysOk = trainingTbd || trainingDays.length > 0;
  const gameDaysOk = gameTbd || gameDays.length > 0;
  const scheduleOk = !showSchedule || (trainingDaysOk && gameDaysOk);

  function parseTrialDate(s: string): string | null {
    const parts = s.trim().split("/");
    if (parts.length !== 3 || parts[2].length !== 4) return null;
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  const trialSlotOrderErrors: boolean[] = trialSlots.map((slot, i) => {
    if (i === 0) return false;
    const prev = trialSlots[i - 1];
    const pd = parseTrialDate(prev.date);
    const cd = parseTrialDate(slot.date);
    if (!pd || !cd) return false;
    if (cd < pd) return true;
    if (cd === pd && slot.timeFrom.trim() !== "" && prev.timeFrom.trim() !== "" && slot.timeFrom.trim() <= prev.timeFrom.trim()) return true;
    return false;
  });
  const trialSlotDuplicates: boolean[] = trialSlots.map((slot, i) =>
    trialSlots.some((other, j) => j < i && other.date.trim() !== "" && other.date.trim() === slot.date.trim() && other.timeFrom.trim() === slot.timeFrom.trim())
  );
  const hasTrialSlotErrors = trialSlotOrderErrors.some(Boolean) || trialSlotDuplicates.some(Boolean);
  const trialSlotsOk = !isClubTrials || (trialSlots[0].date.trim().length > 0 && !hasTrialSlotErrors);
  const isTechnicalDirector = isCoachWanted && coachRole === "Technical Director";
  const coachWantedOk = !isCoachWanted || (coachRole.trim().length > 0 && (!isTechnicalDirector || focusArea.trim().length > 0) && (isTechnicalDirector || coachExperienceLevel.trim().length > 0) && coachPositionTypes.length > 0);
  const teamGenderOk = (!isPlayersWanted && !isClubTrials && !isCoachWanted) || teamGender.trim().length > 0;

  const canSubmit = title.trim().length > 4 && sport.trim().length > 1 && suburb.trim().length > 1 && state.trim().length > 1 && description.trim().length > 10 && (isTechnicalDirector ? focusArea.trim().length > 0 : ageGroup !== null) && scheduleOk && trialSlotsOk && coachWantedOk && teamGenderOk;

  const validationErrors: string[] = [];
  if (suburb.trim().length <= 1) validationErrors.push("Location (suburb) is missing — add it to your profile");
  if (state.trim().length <= 1) validationErrors.push("State is missing — add it to your profile");
  if (!isTechnicalDirector && ageGroup === null) validationErrors.push("Age Group must be selected");
  if (description.trim().length <= 10) validationErrors.push("Additional Details must be at least 10 characters");
  if (showSchedule && !trainingDaysOk) validationErrors.push("Training days must be selected (or tick TBD)");
  if (showSchedule && !gameDaysOk) validationErrors.push("Game days must be selected (or tick TBD)");
  if (isClubTrials && trialSlots[0].date.trim().length === 0) validationErrors.push("At least one trial date is required");
  if (isClubTrials && hasTrialSlotErrors) validationErrors.push("Trial dates must be in chronological order with no duplicates");
  if (isCoachWanted && !coachRole) validationErrors.push("Club role must be selected");
  if (isTechnicalDirector && !focusArea) validationErrors.push("Focus area must be selected");
  if (!isTechnicalDirector && isCoachWanted && !coachExperienceLevel) validationErrors.push("Experience level must be selected");
  if (isCoachWanted && coachPositionTypes.length === 0) validationErrors.push("Position type must be selected");
  if ((isPlayersWanted || isClubTrials || (isCoachWanted && !isTechnicalDirector)) && !teamGender.trim()) validationErrors.push("Team gender must be selected");

  function toggleDay(list: string[], day: string): string[] {
    return list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
  }

  function togglePosition(p: string) {
    setPositions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  // ── Subscription gating ──────────────────────────────────────────────────
  // Free clubs: max 1 active advert
  // Free players/coaches: NO adverts allowed (only 3 outgoing connections)
  // Paid clubs: unlimited adverts
  // Paid players/coaches: 1 active advert
  const activeMyAdverts = myAdverts.filter((a) => a.status !== "closed");
  const isClubFreeTrialLimited = isClub && !isSubscribed && activeMyAdverts.length >= 1 && !editingId;
  const isPlayerFreeLimited = !isClub && !isSubscribed && !editingId;

  const requiresSubscription = isClubFreeTrialLimited || isPlayerFreeLimited;

  const openPaywallForFeature = (hint: string) => {
    setPaywallHint(hint);
    setPaywallVisible(true);
  };

  // ── Similarity check ──────────────────────────────────────────────────────
  // Returns a 0-1 score of token overlap between two strings.
  function tokenOverlap(a: string, b: string): number {
    const tokenize = (s: string) =>
      new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
    const tokA = tokenize(a);
    const tokB = tokenize(b);
    if (tokA.size === 0 || tokB.size === 0) return 0;
    let shared = 0;
    tokA.forEach((t) => { if (tokB.has(t)) shared++; });
    return shared / Math.min(tokA.size, tokB.size);
  }

  function isSimilarToExisting(draftTitle: string, draftDesc: string): boolean {
    if (!isClub || !isSubscribed) return false; // Only paid clubs can have multiple adverts
    return activeMyAdverts.some((a) => {
      if (a.sport !== sport || a.type !== type) return false;
      const titleScore = tokenOverlap(draftTitle, a.title);
      const descScore = tokenOverlap(draftDesc, a.description);
      return titleScore >= 0.6 || (titleScore >= 0.4 && descScore >= 0.4);
    });
  }

  function resetForm() {
    setDescription("");
    setPlayerDescription("");
    setAgeGroup(null);
    setPreferredAge(null);
    setPositions([]);
    setTrainingDays([]);
    setTrainingFrom("");
    setTrainingTo("");
    setTrainingTbd(false);
    setGameDays([]);
    setGameFrom("");
    setGameTo("");
    setGameTbd(false);
    setFeesFree(false);
    setFeesNegotiable(false);
    setSeasonFeesText("");
    setTrialRequired(false);
    setScheduleNote("");
    setTrialSlots([{ date: "", timeFrom: "", timeTo: "" }]);
    setCoachRole("Head Coach");
    setFocusArea("");
    setCoachExperienceLevel("");
    setCoachPositionTypes([]);
    setCoachSalaryText("");
    setCoachSalaryTbc(false);
    setTeamGender("");
    setPlayerGender("");
    setSubmitted(true);
    setShowErrors(false);
    setDuplicateError(null);
  }

  async function doCreateAdvert(draft: Parameters<typeof createAdvert>[0]) {
    setIsSubmitting(true);
    try {
      await createAdvert(draft);
      setSelectedSport(sport);
      resetForm();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as Record<string, unknown>;
        setDuplicateError(body as DuplicateErrorState);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        Alert.alert("Post failed", "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const submit = () => {
    if (!canSubmit || (isTechnicalDirector ? focusArea.trim().length === 0 : !ageGroup)) return;
    if (allowedSports.length && !allowedSports.includes(sport)) return;

    // Gate: free-tier advert limit
    if (requiresSubscription) {
      openPaywallForFeature(
        isClub
          ? "Free clubs are limited to 1 active advert. Upgrade for unlimited."
          : "Free accounts cannot post adverts. Upgrade to post adverts and get unlimited connections."
      );
      return;
    }

    const seasonFees = !feesFree && seasonFeesText.trim() ? parseFloat(seasonFeesText.replace(/[^0-9.]/g, "")) : undefined;
    const draft = {
      type,
      title,
      sport,
      location: state ? `${suburb.trim()} ${state}` : suburb.trim(),
      level,
      availability: isClubTrials
        ? trialSlots.filter((s) => s.date.trim()).map((s) => s.date).join(", ") || "TBD"
        : trainingTbd && gameTbd ? "TBD" : [trainingDays.join("/") || "TBD", gameDays.join("/") || "TBD"].join(" | "),
      description,
      needs: isPlayersWanted ? "Players wanted" : isClubTrials ? "Club trials" : isCoachWanted ? "Coach wanted" : "Player looking",
      ageGroup: ageGroup?.label,
      preferredAge: preferredAge ?? undefined,
      positions: showCoachTitle ? [] : positions,
      coachTitle: showCoachTitle ? coachTitle : undefined,
      playerDescription: playerDescription.trim() || undefined,
      trainingDays,
      trainingTimeFrom: trainingFrom.trim() || undefined,
      trainingTimeTo: trainingTo.trim() || undefined,
      trainingTbd,
      gameDays,
      gameTimeFrom: gameFrom.trim() || undefined,
      gameTimeTo: gameTo.trim() || undefined,
      gameTbd,
      scheduleNote: isPlayerLooking ? scheduleNote.trim() || undefined : undefined,
      trialSlots: isClubTrials ? trialSlots.filter((s) => s.date.trim()) : undefined,
      focusArea: isTechnicalDirector ? focusArea || undefined : undefined,
      coachRole: isCoachWanted ? coachRole || undefined : undefined,
      coachExperienceLevel: isCoachWanted ? coachExperienceLevel || undefined : undefined,
      coachPositionTypes: isCoachWanted ? coachPositionTypes : undefined,
      coachSalary: isCoachWanted && !coachSalaryTbc && coachSalaryText.trim() ? parseFloat(coachSalaryText.replace(/[^0-9.]/g, "")) : undefined,
      coachSalaryTbc: isCoachWanted ? coachSalaryTbc : undefined,
      seasonFees,
      feesNegotiable,
      feesFree,
      trialRequired,
      teamGender: (isPlayersWanted || isClubTrials || (isCoachWanted && !isTechnicalDirector)) ? teamGender.trim() || undefined : undefined,
      playerGender: (isPlayerLooking || isCoachLooking) ? playerGender.trim() || undefined : undefined,
    };
    if (editingId) {
      updateAdvert(editingId, draft);
      setEditingId(null);
      resetForm();
      return;
    }
    const affiliateExtras = isAffiliatedCoach && (type === "players-wanted" || type === "club-trials")
      ? { postedBy: postedByName, affiliatedClubId: currentAccount?.affiliatedClubId }
      : {};
    const finalDraft = { ...draft, ...affiliateExtras };

    // Show similarity warning if draft closely matches an existing active advert.
    if (isSimilarToExisting(title, description)) {
      setSimilarityWarning({ draft: finalDraft });
      return;
    }
    void doCreateAdvert(finalDraft);
  };

  const isClubLocked = currentAccount?.role === "club" && currentAccount?.clubApprovalStatus !== "approved";
  const clubLockStatus = currentAccount?.clubApprovalStatus ?? "pending";

  // Player/coach 72h cooldown lock — paid accounts must wait 72h after closing an advert
  if (repostCooldownUntil && activeProfile !== "club") {
    const unlockDate = new Date(repostCooldownUntil);
    const remainingMs = unlockDate.getTime() - Date.now();
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    const unlockTimeStr = unlockDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    const unlockDateStr = unlockDate.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    return (
      <ScreenShell>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center" }}>
            <Feather name="clock" size={32} color="#D97706" />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 22, color: colors.foreground, textAlign: "center", letterSpacing: -0.4 }}>
            72-Hour Posting Cooldown
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }}>
            You recently closed an advert. To keep the listings fair, premium accounts must wait 72 hours before posting again.
          </Text>
          <View style={{ backgroundColor: "#FFFBEB", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", padding: 16, alignItems: "center", gap: 4, width: "100%" }}>
            <Text style={{ fontSize: 13, color: "#92400E", fontWeight: "600" }}>Posting unlocks in</Text>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#D97706", letterSpacing: -0.5 }}>{remainingHours}h</Text>
            <Text style={{ fontSize: 13, color: "#92400E" }}>{unlockTimeStr} on {unlockDateStr}</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center", lineHeight: 18 }}>
            You'll receive a push notification when posting is unlocked.
          </Text>
        </View>
      </ScreenShell>
    );
  }

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
              ? "Your club application was not approved. You cannot post adverts. Please contact support for more information."
              : "Your club account is awaiting admin approval. You will be able to post adverts for players and staff once an admin approves your club.\n\nVisit your Profile tab to check your approval status."}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView ref={scrollRef} contentContainerStyle={[localStyles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]} keyboardShouldPersistTaps="handled">
        <View style={localStyles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[localStyles.kicker, { color: colors.primary }]}>Post advert</Text>
            <Text style={[localStyles.title, { color: colors.foreground }]}>Post Your Advertisement</Text>
          </View>
          <View style={[localStyles.roleBadge, { backgroundColor: colors.pitchSoft, flexShrink: 0 }]}> 
            <Feather name={activeProfile === "club" ? "shield" : "user"} color={colors.primary} size={16} />
            <Text style={[localStyles.roleBadgeText, { color: colors.primary }]}>{activeProfile}</Text>
          </View>
        </View>

        {/* ── Duplicate / cooldown error banners ── */}
        {duplicateError?.code === "DUPLICATE_ACTIVE" ? (
          <View style={[localStyles.dupBanner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="alert-circle" size={18} color="#DC2626" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[localStyles.dupBannerTitle, { color: "#DC2626" }]}>Active advert already exists</Text>
              <Text style={[localStyles.dupBannerText, { color: "#991B1B" }]}>
                You already have an active advert for this sport and role. Edit or delete it before posting a new one.
              </Text>
              <Pressable
                onPress={() => {
                  const existing = adverts.find((a) => a.id === duplicateError.existingAdvertId);
                  if (existing) setSelectedMyAdvert(existing);
                  setDuplicateError(null);
                }}
                style={({ pressed }) => [localStyles.dupBannerAction, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 13 }}>View existing advert →</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setDuplicateError(null)}>
              <Feather name="x" size={18} color="#DC2626" />
            </Pressable>
          </View>
        ) : null}

        {duplicateError?.code === "REPOST_COOLDOWN" ? (() => {
          const availableAt = new Date(duplicateError.repostAvailableAt);
          const remainingMs = availableAt.getTime() - Date.now();
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
          const timeStr = remainingMs > 0
            ? `${remainingHours}h remaining (available ${availableAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} ${availableAt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })})`
            : "Repost available now";
          return (
            <View style={[localStyles.dupBanner, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Feather name="clock" size={18} color="#D97706" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[localStyles.dupBannerTitle, { color: "#92400E" }]}>48-hour repost cooldown</Text>
                <Text style={[localStyles.dupBannerText, { color: "#78350F" }]}>
                  To prevent flooding, you must wait 48 hours after your last advert expires before reposting the same sport and role.
                </Text>
                <Text style={[localStyles.dupBannerText, { color: "#92400E", fontWeight: "700" }]}>{timeStr}</Text>
              </View>
              <Pressable onPress={() => setDuplicateError(null)}>
                <Feather name="x" size={18} color="#D97706" />
              </Pressable>
            </View>
          );
        })() : null}

        {duplicateError?.code === "PLAYER_COOLDOWN" ? (() => {
          const availableAt = new Date(duplicateError.repostAvailableAt);
          const remainingMs = availableAt.getTime() - Date.now();
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
          const timeStr = remainingMs > 0
            ? `${remainingHours}h remaining (${availableAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} ${availableAt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })})`
            : "Posting available now";
          return (
            <View style={[localStyles.dupBanner, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Feather name="clock" size={18} color="#D97706" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[localStyles.dupBannerTitle, { color: "#92400E" }]}>72-hour posting cooldown</Text>
                <Text style={[localStyles.dupBannerText, { color: "#78350F" }]}>
                  You recently closed an advert. Premium accounts must wait 72 hours before posting again to keep listings fair.
                </Text>
                <Text style={[localStyles.dupBannerText, { color: "#92400E", fontWeight: "700" }]}>{timeStr}</Text>
              </View>
              <Pressable onPress={() => setDuplicateError(null)}>
                <Feather name="x" size={18} color="#D97706" />
              </Pressable>
            </View>
          );
        })() : null}

        {/* ── Subscription status banner ── */}
        {isSubscribed ? (
          <View style={[localStyles.subBanner, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Feather name="star" size={16} color="#D97706" />
            <Text style={[localStyles.subBannerText, { color: "#15803D" }]}>Premium — unlimited adverts active</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => openPaywallForFeature(
              isClub
                ? "Upgrade to post unlimited adverts, BUMP to top of list, and unlock Coach Affiliates."
                : "Upgrade for unlimited connections and 1 active advert at a time."
            )}
            style={({ pressed }) => [localStyles.subBanner, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="lock" size={15} color="#D97706" />
            <Text style={[localStyles.subBannerText, { color: "#92400E" }]}>
              {isClub ? "Free trial — 1 advert limit. Tap to upgrade." : "Free — 1 advert limit. Tap to upgrade."}
            </Text>
            <Feather name="chevron-right" size={15} color="#D97706" style={{ marginLeft: "auto" }} />
          </Pressable>
        )}

        <View style={[localStyles.sportHeader, { backgroundColor: activeTheme.background, borderColor: activeTheme.soft }]}> 
          <Text style={[localStyles.sportHeaderKicker, { color: activeTheme.primary }]}>Posting under</Text>
          <Text style={[localStyles.sportHeaderTitle, { color: activeTheme.text }]}>{sport}</Text>
        </View>

        {editingId ? (
          <View style={[localStyles.editingBanner, { backgroundColor: colors.amberSoft }]}>
            <Feather name="edit-2" size={16} color={colors.accentForeground} />
            <Text style={[localStyles.editingBannerText, { color: colors.accentForeground }]}>Editing your advert — make changes below and save</Text>
            <Pressable onPress={cancelEdit} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Feather name="x" size={18} color={colors.accentForeground} />
            </Pressable>
          </View>
        ) : null}

        <View style={[localStyles.formCard, { backgroundColor: colors.card, borderColor: activeTheme.soft }]}> 
          <Text style={[localStyles.formTitle, { color: colors.foreground }]}>Advert type</Text>
          <View style={localStyles.pillRow}>
            {availableTypes.map((item) => (
              <Pill
                key={item.value}
                label={item.label}
                active={type === item.value}
                disabled={(item as any).disabled}
                onPressWhenDisabled={() => Alert.alert(
                  "Affiliation required",
                  "You need to be affiliated with a club to post this type of advert. Ask a club to send you an affiliate request from their Coach Affiliates section."
                )}
                onPress={() => {
                  setType(item.value);
                  setPositions([]);
                }}
              />
            ))}
          </View>

          {/* ── Club Role / Coach Role (first for coach-wanted) ── */}
          {isCoachWanted && (
            <>
              <FormLabel text="Club Role" required />
              <View style={localStyles.pillRow}>
                {COACH_ROLES.map((r) => (
                  <Pill key={r} label={r} active={coachRole === r} onPress={() => setCoachRole(r)} />
                ))}
              </View>
            </>
          )}

          <FormLabel text="Sport" />
          <Text style={[localStyles.formHint, { color: colors.mutedForeground }]}>{activeProfile === "club" ? "Clubs can only post for their single club sport." : "Only your selected sports are available here."}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.sportPickerScroll}>
            {sportChoices.map((item) => (
              <Pressable key={item.name} onPress={() => { setSport(item.name); setPositions([]); }} style={({ pressed }) => [localStyles.sportChip, { backgroundColor: sport === item.name ? item.button : item.soft, opacity: pressed ? 0.75 : 1 }] }>
                <Text style={[localStyles.sportChipText, { color: sport === item.name ? "#FFFFFF" : item.text }]}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ── Generated title preview ── */}
          <View style={[localStyles.titlePreviewCard, { backgroundColor: colors.secondary, borderColor: activeTheme.soft }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Text style={[localStyles.titlePreviewLabel, { color: colors.mutedForeground }]}>Your advert title</Text>
            </View>
            <Text style={[localStyles.titlePreviewText, { color: colors.foreground }]} numberOfLines={3}>
              {title || "Fill in the form below to generate your title"}
            </Text>
            <Text style={[localStyles.titlePreviewHint, { color: colors.mutedForeground }]}>Location is taken from your profile</Text>
          </View>

          {isTechnicalDirector ? (
            <>
              <FormLabel text="Focus Area" required />
              <View style={localStyles.pillRow}>
                {FOCUS_AREAS.map((f) => (
                  <Pill key={f} label={f} active={focusArea === f} onPress={() => setFocusArea(f)} />
                ))}
              </View>
            </>
          ) : (
            <>
              <FormLabel text="Age Group" required />
              <View style={{ gap: 6 }}>
                {AGE_GROUPS.map((g) => (
                  <Pressable key={g.label} onPress={() => { setAgeGroup(g); setPreferredAge(null); }} style={[localStyles.ageGroupRow, { backgroundColor: ageGroup?.label === g.label ? colors.primary : colors.secondary, borderColor: ageGroup?.label === g.label ? colors.primary : colors.border }] }>
                    <Text style={[localStyles.ageGroupText, { color: ageGroup?.label === g.label ? "#FFF" : colors.secondaryForeground }]}>{g.label}</Text>
                    {ageGroup?.label === g.label ? <Feather name="check" color="#FFF" size={14} /> : null}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {((isCoachWanted && !isTechnicalDirector) || (ageGroup !== null && (isPlayersWanted || isClubTrials || isCoachWanted))) && (
            <>
              <FormLabel text="Team Gender" required />
              <View style={[localStyles.choiceRow, { marginBottom: 12 }]}>
                {TEAM_GENDERS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setTeamGender(item)}
                    style={({ pressed }) => [
                      localStyles.choice,
                      {
                        backgroundColor: teamGender === item ? colors.primary : colors.secondary,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[localStyles.choiceText, { color: teamGender === item ? "#FFFFFF" : colors.secondaryForeground }]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {ageGroup !== null && (isPlayerLooking || isCoachLooking) && (
            <>
              <FormLabel text={isCoachLooking ? "Coach Gender" : "Player Gender"} />
              <View style={[localStyles.choiceRow, { marginBottom: 12 }]}>
                {PLAYER_GENDERS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setPlayerGender(playerGender === item ? "" : item)}
                    style={({ pressed }) => [
                      localStyles.choice,
                      {
                        backgroundColor: playerGender === item ? colors.primary : colors.secondary,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[localStyles.choiceText, { color: playerGender === item ? "#FFFFFF" : colors.secondaryForeground }]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {ageGroup !== null && !isTechnicalDirector && (
            <>
              <FormLabel text="Preferred age (optional)" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.sportPickerScroll}>
                {agesInGroup(ageGroup).map((age) => (
                  <Pressable
                    key={age}
                    onPress={() => setPreferredAge(preferredAge === age ? null : age)}
                    style={[localStyles.sportChip, { backgroundColor: preferredAge === age ? colors.primary : colors.secondary }]}
                  >
                    <Text style={[localStyles.sportChipText, { color: preferredAge === age ? "#FFFFFF" : colors.secondaryForeground }]}>{age}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {!isCoachWanted && (
            <>
              <FormLabel text="Position(s)" />
              <View style={localStyles.pillRow}>
                {positionOptions.map((p) => (
                  <Pill key={p} label={p} active={positions.includes(p)} onPress={() => togglePosition(p)} />
                ))}
              </View>
            </>
          )}

          {showCoachTitle && (
            <>
              <FormLabel text="Coach level / title (optional)" />
              <View style={localStyles.pillRow}>
                {coachTitles.map((t) => (
                  <Pill key={t} label={t} active={coachTitle === t} onPress={() => setCoachTitle(coachTitle === t ? "" : t)} />
                ))}
              </View>
            </>
          )}

          {!isTechnicalDirector && (
            <>
              <FormLabel text="Level" />
              <Field value={level} onChangeText={setLevel} label="" placeholder="e.g. Competitive Amateur, Semi-Pro" />
            </>
          )}

          {showPlayerDesc && (
            <>
              <FormLabel text={isCoachLooking ? "About the coach" : "About the player"} />
              <Field value={playerDescription} onChangeText={setPlayerDescription} label="" multiline placeholder="Describe the player or coach, experience, goals…" />
            </>
          )}

          {showSchedule && (
            <>
              <DayPicker label="Training Days" selected={trainingDays} onToggle={(d) => setTrainingDays(toggleDay(trainingDays, d))} tbd={trainingTbd} onTbdToggle={() => setTrainingTbd(!trainingTbd)} />
              <TimeRow label="Training Time" from={trainingFrom} to={trainingTo} onFromChange={setTrainingFrom} onToChange={setTrainingTo} disabled={trainingTbd} />
              <DayPicker label="Game Days" selected={gameDays} onToggle={(d) => setGameDays(toggleDay(gameDays, d))} tbd={gameTbd} onTbdToggle={() => setGameTbd(!gameTbd)} />
              <TimeRow label="Game Time" from={gameFrom} to={gameTo} onFromChange={setGameFrom} onToChange={setGameTo} disabled={gameTbd} />
            </>
          )}

          {isPlayerLooking && (
            <>
              <FormLabel text="Training / game day notes (optional)" />
              <Field value={scheduleNote} onChangeText={setScheduleNote} label="" multiline placeholder="e.g. Prefer weeknight training, Saturday games" />
            </>
          )}

          {isClubTrials && (
            <>
              <FormLabel text="Trial date(s) (DD/MM/YYYY)" required />
              {trialSlots.map((slot, i) => (
                <View key={i} style={{ gap: 6, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 2 }}>
                      <Text style={[localStyles.timeSubLabel, { color: colors.mutedForeground }]}>DATE</Text>
                      <TextInput
                        value={slot.date}
                        onChangeText={(v) => setTrialSlots((prev) => prev.map((s, j) => j === i ? { ...s, date: v } : s))}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="number-pad"
                        style={[localStyles.timeInput, { backgroundColor: colors.card, borderColor: trialSlotOrderErrors[i] || trialSlotDuplicates[i] ? "#D9534F" : colors.border, color: colors.foreground }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[localStyles.timeSubLabel, { color: colors.mutedForeground }]}>FROM</Text>
                      <TextInput
                        value={slot.timeFrom}
                        onChangeText={(v) => setTrialSlots((prev) => prev.map((s, j) => j === i ? { ...s, timeFrom: v } : s))}
                        placeholder="6:00 PM"
                        placeholderTextColor={colors.mutedForeground}
                        style={[localStyles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[localStyles.timeSubLabel, { color: colors.mutedForeground }]}>TO</Text>
                      <TextInput
                        value={slot.timeTo}
                        onChangeText={(v) => setTrialSlots((prev) => prev.map((s, j) => j === i ? { ...s, timeTo: v } : s))}
                        placeholder="8:00 PM"
                        placeholderTextColor={colors.mutedForeground}
                        style={[localStyles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      />
                    </View>
                    {i > 0 ? (
                      <Pressable onPress={() => setTrialSlots((prev) => prev.filter((_, j) => j !== i))} style={{ alignSelf: "flex-end", marginBottom: 4 }}>
                        <Feather name="x-circle" size={20} color="#D9534F" />
                      </Pressable>
                    ) : null}
                  </View>
                  {trialSlotOrderErrors[i] && <Text style={{ color: "#D9534F", fontWeight: "600", fontSize: 12 }}>Trial dates must be in chronological order</Text>}
                  {trialSlotDuplicates[i] && <Text style={{ color: "#D9534F", fontWeight: "600", fontSize: 12 }}>Duplicate trial date/time</Text>}
                </View>
              ))}
              <Pressable onPress={() => setTrialSlots((prev) => [...prev, { date: "", timeFrom: "", timeTo: "" }])} style={({ pressed }) => [localStyles.addSlotButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[localStyles.addSlotText, { color: colors.primary }]}>Add another trial date</Text>
              </Pressable>
            </>
          )}

          {isCoachWanted && !isTechnicalDirector && (
            <>
              <FormLabel text="Experience level required" required />
              <View style={{ gap: 6 }}>
                {COACH_EXPERIENCE_LEVELS.map((l) => (
                  <Pressable key={l.value} onPress={() => setCoachExperienceLevel(l.value)} style={[localStyles.ageGroupRow, { backgroundColor: coachExperienceLevel === l.value ? colors.primary : colors.secondary, borderColor: coachExperienceLevel === l.value ? colors.primary : colors.border }]}>
                    <Text style={[localStyles.ageGroupText, { color: coachExperienceLevel === l.value ? "#FFF" : colors.secondaryForeground }]}>{l.label}</Text>
                    {coachExperienceLevel === l.value ? <Feather name="check" color="#FFF" size={14} /> : null}
                  </Pressable>
                ))}
              </View>

              <FormLabel text="Position type" required />
              <View style={localStyles.pillRow}>
                {COACH_POSITION_TYPES.map((pt) => (
                  <Pill key={pt} label={pt} active={coachPositionTypes.includes(pt)} onPress={() => setCoachPositionTypes((prev) => prev.includes(pt) ? prev.filter((x) => x !== pt) : [...prev, pt])} />
                ))}
              </View>

              <FormLabel text="Salary / remuneration (optional)" />
              <CheckRow label="TBD / Negotiable" value={coachSalaryTbc} onToggle={() => setCoachSalaryTbc(!coachSalaryTbc)} />
              {!coachSalaryTbc && (
                <Field label="" value={coachSalaryText} onChangeText={setCoachSalaryText} keyboardType="numeric" placeholder="e.g. 25000 (annual AUD)" />
              )}
            </>
          )}

          {showClubFees && (
            <>
              <FormLabel text="Season fees (optional)" />
              <CheckRow label="Free / Scholarship" value={feesFree} onToggle={() => setFeesFree(!feesFree)} />
              {!feesFree && (
                <>
                  <Field label="" value={seasonFeesText} onChangeText={setSeasonFeesText} keyboardType="numeric" placeholder="e.g. 350 (AUD per season)" />
                  <CheckRow label="Or near offer (negotiable)" value={feesNegotiable} onToggle={() => setFeesNegotiable(!feesNegotiable)} />
                </>
              )}
            </>
          )}

          {!isPlayerLooking && (
            <CheckRow label="Trial required" value={trialRequired} onToggle={() => setTrialRequired(!trialRequired)} />
          )}

          <FormLabel text="Additional details" required />
          <Field value={description} onChangeText={(text) => {
            const words = text.trim().split(/\s+/).filter(Boolean);
            if (words.length <= 150) setDescription(text);
          }} label="" multiline placeholder={isPlayerLooking ? "Describe yourself as a player and what you're looking for. Please do not share any of your personal information including mobile or email addresses." : "Describe exactly what you're looking for. Do not add personal details such as mobile numbers or email addresses."} />
          <Text style={{ fontSize: 12, color: description.trim().split(/\s+/).filter(Boolean).length > 140 ? "#D9534F" : colors.mutedForeground, marginTop: 4, textAlign: "right" }}>
            {description.trim().split(/\s+/).filter(Boolean).length} / 150 words
          </Text>
        </View>

        {submitted && !editingId ? (
          <View style={[localStyles.successBox, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Feather name="check-circle" color="#16A34A" size={24} />
            <Text style={[localStyles.successTitle, { color: "#15803D" }]}>Advert posted!</Text>
            <Text style={[localStyles.successText, { color: "#166534" }]}>Your advert is now live in the Discover tab. You can manage and edit it here.</Text>
          </View>
        ) : null}

        {showErrors && validationErrors.length > 0 ? (
          <View style={[localStyles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#D9534F" }]}>
            {validationErrors.map((e) => (
              <View key={e} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <Feather name="alert-circle" size={14} color="#D9534F" style={{ marginTop: 2 }} />
                <Text style={{ color: "#D9534F", fontWeight: "600", fontSize: 13 }}>{e}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <PrimaryButton
          label={isSubmitting ? "Posting…" : editingId ? "Save changes" : "Post Advert"}
          icon={editingId ? "save" : "send"}
          onPress={() => {
            if (isSubmitting) return;
            if (!canSubmit) { setShowErrors(true); return; }
            submit();
          }}
        />

        {myAdverts.length > 0 ? (
          <>
            <SectionTitle title="My adverts" action={`${myAdverts.length} live`} />
            <FlatList
              data={myAdverts}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MyAdvertCard advert={item} onPress={() => setSelectedMyAdvert(item)} />
              )}
            />
          </>
        ) : null}
      </ScrollView>

      {selectedMyAdvert && !editingId ? (
        <MyAdvertDetail
          advert={selectedMyAdvert}
          onClose={() => setSelectedMyAdvert(null)}
          onEdit={() => loadAdvertForEdit(selectedMyAdvert)}
        />
      ) : null}

      <SubscriptionPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        featureHint={paywallHint}
      />

      {/* ── Similarity warning dialog ── */}
      {similarityWarning ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSimilarityWarning(null)}>
          <View style={localStyles.modalScrim}>
            <View style={[localStyles.simWarnCard, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="copy" size={20} color="#D97706" />
                </View>
                <Text style={{ fontWeight: "800", fontSize: 18, color: colors.foreground, flex: 1 }}>Possible duplicate</Text>
              </View>
              <Text style={{ fontWeight: "500", fontSize: 14, color: colors.mutedForeground, lineHeight: 22, marginBottom: 20 }}>
                This advert looks similar to one you already have active for the same sport and role. Are you sure you want to post it as a new advert?
              </Text>
              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    const draft = similarityWarning.draft;
                    setSimilarityWarning(null);
                    void doCreateAdvert(draft);
                  }}
                  style={({ pressed }) => [localStyles.simWarnPrimary, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Yes, post as new advert</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSimilarityWarning(null)}
                  style={({ pressed }) => [localStyles.simWarnSecondary, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={{ color: colors.secondaryForeground, fontWeight: "700", fontSize: 15 }}>Cancel — edit instead</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </ScreenShell>
  );
}

const localStyles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "800", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  roleBadgeText: { fontWeight: "700", fontSize: 13, textTransform: "capitalize" },
  subBanner: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  subBannerText: { fontWeight: "700", fontSize: 13, flex: 1 },
  sportHeader: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 4 },
  sportHeaderKicker: { fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  sportHeaderTitle: { fontWeight: "800", fontSize: 22, letterSpacing: -0.5 },
  editingBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, padding: 14 },
  editingBannerText: { fontWeight: "700", fontSize: 13, flex: 1 },
  formCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 4 },
  formTitle: { fontWeight: "800", fontSize: 18, marginBottom: 4 },
  formLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  formHint: { fontWeight: "500", fontSize: 12, marginBottom: 6 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  sportPickerScroll: { paddingRight: 16, gap: 8 },
  sportChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  sportChipText: { fontWeight: "700", fontSize: 13 },
  ageGroupRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 14, padding: 12 },
  ageGroupText: { fontWeight: "600", fontSize: 14, flex: 1 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  choiceText: { fontWeight: "700", fontSize: 13 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkLabel: { fontWeight: "600", fontSize: 14 },
  dayRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dayChipText: { fontWeight: "700", fontSize: 13 },
  timeRowInner: { flexDirection: "row", gap: 10 },
  timeSubLabel: { fontWeight: "700", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  timeInput: { borderWidth: 1, borderRadius: 12, minHeight: 44, paddingHorizontal: 12, fontWeight: "600", fontSize: 14 },
  addSlotButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, padding: 12 },
  addSlotText: { fontWeight: "700", fontSize: 14 },
  titlePreviewCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 8, marginBottom: 4, gap: 4 },
  titlePreviewLabel: { fontWeight: "600", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  titlePreviewText: { fontWeight: "700", fontSize: 15, lineHeight: 22 },
  titlePreviewHint: { fontWeight: "400", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  successBox: { borderWidth: 1, borderRadius: 24, padding: 20, alignItems: "center", gap: 8 },
  successTitle: { fontWeight: "800", fontSize: 18 },
  successText: { fontWeight: "500", fontSize: 14, lineHeight: 21, textAlign: "center" },
  errorBox: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  myCard: { borderWidth: 1, borderRadius: 26, padding: 14, marginBottom: 12 },
  expiryRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: "flex-start", marginBottom: 8 },
  expiryText: { fontWeight: "700", fontSize: 11 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  cardType: { fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
  cardDistance: { fontWeight: "700", fontSize: 12 },
  cardTitle: { fontWeight: "700", fontSize: 17, lineHeight: 22 },
  cardText: { fontWeight: "500", fontSize: 13 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  cardFooterText: { fontWeight: "600", fontSize: 12 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: "92%", overflow: "hidden" },
  detailExpiryBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  detailExpiryText: { fontWeight: "700", fontSize: 13, flex: 1 },
  detailScroll: { paddingHorizontal: 22, paddingBottom: 34, gap: 4 },
  detailTypeLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16 },
  detailTitle: { fontWeight: "800", fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  detailChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontWeight: "700", fontSize: 12 },
  detailSection: { gap: 4, marginTop: 10 },
  detailLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 },
  detailValue: { fontWeight: "600", fontSize: 15, lineHeight: 21 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontWeight: "600", fontSize: 12 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14, marginVertical: 6 },
  editButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 1.5, paddingVertical: 14, marginVertical: 6 },
  deleteButtonText: { fontWeight: "700", fontSize: 15 },
  deleteConfirmBox: { borderWidth: 1.5, borderRadius: 18, padding: 16, gap: 12, marginVertical: 6 },
  deleteConfirmText: { fontWeight: "600", fontSize: 14, lineHeight: 21, color: "#991B1B" },
  deleteConfirmRow: { flexDirection: "row", gap: 10 },
  deleteConfirmCancel: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteConfirmCancelText: { fontWeight: "700", fontSize: 15 },
  deleteConfirmYes: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#D9534F", borderRadius: 14, paddingVertical: 12 },
  deleteConfirmYesText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  dupBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  dupBannerTitle: { fontWeight: "800", fontSize: 14, marginBottom: 2 },
  dupBannerText: { fontWeight: "500", fontSize: 13, lineHeight: 19 },
  dupBannerAction: { marginTop: 6 },
  simWarnCard: { margin: 24, borderRadius: 28, padding: 24 },
  simWarnPrimary: { borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  simWarnSecondary: { borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
});
