import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Pill, PrimaryButton, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { Advert, AccountRole, useSportsConnect } from "@/context/SportsConnectContext";
import { getSportTheme } from "@/constants/sports";
import { useColors } from "@/hooks/useColors";

type AgeGroup = { label: string; min: number; max: number };
const AGE_GROUPS: AgeGroup[] = [
  { label: "Tiny Tots / Minis (Ages 3–6)", min: 3, max: 6 },
  { label: "Junior (Ages 7–11)", min: 7, max: 11 },
  { label: "Intermediate / Youth (Ages 12–15)", min: 12, max: 15 },
  { label: "Senior Youth (Ages 16–20)", min: 16, max: 20 },
  { label: "Senior (Ages 21+)", min: 21, max: 50 },
];

function agesInGroup(group: AgeGroup) {
  return Array.from({ length: group.max - group.min + 1 }, (_, i) => group.min + i);
}

const SPORT_POSITIONS: Record<string, string[]> = {
  "Football (Soccer)": [
    "Goalkeeper (GK)",
    "Centre Back (CB)",
    "Full Back (LB/RB)",
    "Wing Back (LWB/RWB)",
    "Sweeper",
    "Defensive Midfielder (CDM)",
    "Central Midfielder (CM)",
    "Attacking Midfielder (CAM)",
    "Wide Midfielder (LM/RM)",
    "Winger (LW/RW)",
    "Box-to-Box Midfielder",
    "Striker (ST)",
    "Centre Forward (CF)",
    "Second Striker (SS)",
    "False 9",
  ],
  "Futsal (Indoor Soccer)": ["Goalkeeper", "Defender (Fixo)", "Winger (Ala)", "Pivot"],
  "Aussie Rules Football": [
    "Full Forward",
    "Forward Pocket",
    "Centre Half Forward",
    "Half Forward Flank",
    "Wing",
    "Centre",
    "Half Back Flank",
    "Centre Half Back",
    "Full Back",
    "Back Pocket",
    "Ruck",
    "Ruck Rover",
    "Rover",
    "Interchange / Bench",
  ],
  "Rugby League": [
    "Fullback",
    "Wing",
    "Centre",
    "Five-Eighth",
    "Halfback",
    "Prop",
    "Hooker",
    "Second Row",
    "Lock Forward",
  ],
  "Rugby Union": [
    "Fullback",
    "Wing",
    "Centre",
    "Fly-half",
    "Scrum-half",
    "Loosehead Prop",
    "Tighthead Prop",
    "Hooker",
    "Lock",
    "Blindside Flanker",
    "Openside Flanker",
    "Number 8",
  ],
  "Touch Rugby": ["Middle", "Link", "Wing"],
  "Cricket": [
    "Opening Batter",
    "Top Order Batter",
    "Middle Order Batter",
    "Lower Order / Tailender",
    "Wicketkeeper",
    "All-rounder",
    "Fast Bowler",
    "Medium Bowler",
    "Spin Bowler",
    "Slip",
    "Gully",
    "Point",
    "Cover",
    "Mid-off",
    "Mid-on",
    "Square Leg",
    "Fine Leg",
  ],
  "Indoor Cricket": ["Wicketkeeper", "Bowler", "Batter", "Zone A", "Zone B", "Zone C", "Zone D"],
  "Basketball": ["Point Guard (PG)", "Shooting Guard (SG)", "Small Forward (SF)", "Power Forward (PF)", "Centre (C)"],
  "Netball": ["Goal Shooter (GS)", "Goal Attack (GA)", "Wing Attack (WA)", "Centre (C)", "Wing Defence (WD)", "Goal Defence (GD)", "Goal Keeper (GK)"],
  "Volleyball": ["Setter", "Outside Hitter (Left-side)", "Opposite Hitter (Right-side)", "Middle Blocker", "Libero", "Defensive Specialist"],
};

function getPositions(sport: string): string[] {
  return SPORT_POSITIONS[sport] ?? ["General Player"];
}

const advertTypesByRole: Record<AccountRole, { value: Advert["type"]; label: string }[]> = {
  player: [{ value: "player-looking", label: "Player looking for Club" }],
  guardian: [{ value: "player-looking", label: "Parent/Guardian's Player Looking for a Club" }],
  coach: [{ value: "coach-looking", label: "Coach looking for Team or Club" }],
  club: [
    { value: "players-wanted", label: "Players Wanted for Team" },
    { value: "club-trials", label: "Club Trials Info" },
    { value: "coach-wanted", label: "Coach Wanted for Team" },
  ],
};

const coachTitles = ["Senior", "Assistant", "Amateur", "Experienced", "Inexperienced", "Intermediate", "Professional"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

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

const ADVERT_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000;

function getExpiryInfo(createdAt: string) {
  const expiresAt = new Date(createdAt).getTime() + ADVERT_LIFESPAN_MS;
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
    : type === "coach-wanted" ? "Coach Wanted for Team"
    : type === "club-trials" ? "Club Trials Info"
    : "Players Wanted for Team";
}

function MyAdvertCard({ advert, onPress }: { advert: Advert; onPress: () => void }) {
  const colors = useColors();
  const { approvedSports } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  const expiry = getExpiryInfo(advert.createdAt);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [localStyles.myCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}>
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
      {advert.ageGroup ? <Text style={[localStyles.cardText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.ageGroup}</Text> : null}
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
  const { approvedSports, deleteAdvert } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  const expiry = getExpiryInfo(advert.createdAt);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
  const { createAdvert, updateAdvert, adverts, activeProfile, clubProfile, playerProfile, approvedSports, selectedSport, setSelectedSport, currentAccount } = useSportsConnect();
  const accountRole = currentAccount?.role ?? activeProfile;

  const allowedSports = activeProfile === "club"
    ? [currentAccount?.defaultSport || clubProfile.sport].filter(Boolean)
    : (currentAccount?.sports?.length ? currentAccount.sports : [playerProfile.sports.split(", ")[0] || selectedSport]).filter(Boolean);

  const [selectedMyAdvert, setSelectedMyAdvert] = useState<Advert | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [type, setType] = useState<Advert["type"]>(advertTypesByRole[accountRole][0].value);
  const [sport, setSport] = useState(currentAccount?.defaultSport || allowedSports[0] || selectedSport);
  const [suburb, setSuburb] = useState(playerProfile.location);
  const [state, setState] = useState("");
  const [level, setLevel] = useState("Competitive amateur");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
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
  const [title, setTitle] = useState("");

  useEffect(() => {
    const nextSport = currentAccount?.defaultSport || allowedSports[0] || selectedSport;
    setSport((current) => (allowedSports.includes(current) ? current : nextSport));
    setPositions([]);
  }, [allowedSports, currentAccount?.defaultSport, selectedSport]);

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
  }, [currentAccount?.defaultSport, allowedSports, selectedSport, editingId]);

  useEffect(() => {
    const sportLabel = sport.includes(" (") ? sport.split(" (")[0] : sport;
    const roleLabel =
      type === "players-wanted" ? "Players wanted" :
      type === "club-trials" ? "Club trials" :
      type === "coach-wanted" ? "Coach wanted" :
      type === "coach-looking" ? "Coach seeking club" :
      "Player seeking club";
    const ageLabel = ageGroup ? ageGroup.label.replace(/\(.*\)/, "").trim() : "";
    const coachTitleLabel = type === "coach-looking" ? coachTitle : "";
    const positionLabel = positions.length === 1 ? positions[0] : "";
    const levelLabel = level.trim() && level !== "Competitive amateur" ? level.trim() : "";
    const locationLabel = suburb.trim();
    const ending = locationLabel ? `in ${locationLabel}` : "";
    const parts = [ageLabel, coachTitleLabel, positionLabel, levelLabel, roleLabel, sportLabel].filter(Boolean);
    const titleBody = parts.join(" ").replace(/\s+/g, " ").trim().split(" ").slice(0, 10).join(" ");
    setTitle([titleBody, ending].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
  }, [sport, type, ageGroup, coachTitle, positions, level, suburb, state]);

  const loadAdvertForEdit = (advert: Advert) => {
    setEditingId(advert.id);
    setType(advert.type);
    setSport(advert.sport);
    const parts = advert.location.split(", ");
    setSuburb(parts.slice(0, -1).join(", ") || advert.location);
    setState(parts[parts.length - 1] || "");
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
    setSubmitted(false);
  };

  const ownerName = activeProfile === "club" ? clubProfile.name : playerProfile.name;
  const myAdverts = adverts.filter((a) => a.postedBy === ownerName);
  const activeTheme = getSportTheme(sport, approvedSports);
  const sportChoices = allowedSports.length ? approvedSports.filter((s) => allowedSports.includes(s.name)) : approvedSports;
  const availableTypes = advertTypesByRole[accountRole];
  const positionOptions = getPositions(sport);

  const isPlayerLooking = type === "player-looking";
  const isCoachLooking = type === "coach-looking";
  const isPlayersWanted = type === "players-wanted";
  const isClubTrials = type === "club-trials";
  const isCoachWanted = type === "coach-wanted";
  const showPlayerDesc = isPlayerLooking || isCoachLooking;
  const showClubDesc = isPlayersWanted || isClubTrials || isCoachWanted;
  const showCoachTitle = isCoachLooking;
  const showSchedule = isPlayerLooking || isPlayersWanted;
  const showClubFees = isPlayersWanted;
  const trainingDaysOk = trainingTbd || trainingDays.length > 0;
  const gameDaysOk = gameTbd || gameDays.length > 0;
  const scheduleOk = !showSchedule || (trainingDaysOk && gameDaysOk);
  const canSubmit = title.trim().length > 4 && sport.trim().length > 1 && suburb.trim().length > 1 && state.trim().length > 1 && description.trim().length > 10 && ageGroup !== null && scheduleOk;

  function toggleDay(list: string[], day: string): string[] {
    return list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
  }

  function togglePosition(p: string) {
    setPositions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  const submit = () => {
    if (!canSubmit || !ageGroup) return;
    if (allowedSports.length && !allowedSports.includes(sport)) return;
    const seasonFees = !feesFree && seasonFeesText.trim() ? parseFloat(seasonFeesText.replace(/[^0-9.]/g, "")) : undefined;
    const draft = {
      type,
      title,
      sport,
      location: suburb.trim(),
      level,
      availability: trainingTbd && gameTbd ? "TBD" : [trainingDays.join("/") || "TBD", gameDays.join("/") || "TBD"].join(" | "),
      description,
      needs: isPlayersWanted ? "Players wanted" : isClubTrials ? "Club trials" : isCoachWanted ? "Coach wanted" : "Player looking",
      ageGroup: ageGroup.label,
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
      seasonFees,
      feesNegotiable,
      feesFree,
      trialRequired,
    };
    if (editingId) {
      updateAdvert(editingId, draft);
      setEditingId(null);
    } else {
      createAdvert(draft);
      setSelectedSport(sport);
    }
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
    setSubmitted(true);
  };

  return (
    <ScreenShell>
      <ScrollView ref={scrollRef} contentContainerStyle={[localStyles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]} keyboardShouldPersistTaps="handled">
        <View style={localStyles.headerRow}>
          <View>
            <Text style={[localStyles.kicker, { color: colors.primary }]}>Post advert</Text>
            <Text style={[localStyles.title, { color: colors.foreground }]}>Post Your Advertisement</Text>
          </View>
          <View style={[localStyles.roleBadge, { backgroundColor: colors.pitchSoft }]}> 
            <Feather name={activeProfile === "club" ? "shield" : "user"} color={colors.primary} size={16} />
            <Text style={[localStyles.roleBadgeText, { color: colors.primary }]}>{activeProfile}</Text>
          </View>
        </View>

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
              <Pill key={item.value} label={item.label} active={type === item.value} onPress={() => { setType(item.value); setPositions([]); }} />
            ))}
          </View>

          <FormLabel text="Sport" />
          <Text style={[localStyles.formHint, { color: colors.mutedForeground }]}>{activeProfile === "club" ? "Clubs can only post for their single club sport." : "Only your selected sports are available here."}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.sportPickerScroll}>
            {sportChoices.map((item) => (
              <Pressable key={item.name} onPress={() => { setSport(item.name); setPositions([]); }} style={({ pressed }) => [localStyles.sportChip, { backgroundColor: sport === item.name ? item.button : item.soft, opacity: pressed ? 0.75 : 1 }] }>
                <Text style={[localStyles.sportChipText, { color: sport === item.name ? "#FFFFFF" : item.text }]}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <FormLabel text="Age Group" required />
          <View style={{ gap: 6 }}>
            {AGE_GROUPS.map((g) => (
              <Pressable key={g.label} onPress={() => { setAgeGroup(g); setPreferredAge(null); }} style={[localStyles.ageGroupRow, { backgroundColor: ageGroup?.label === g.label ? colors.primary : colors.secondary, borderColor: ageGroup?.label === g.label ? colors.primary : colors.border }] }>
                <Text style={[localStyles.ageGroupText, { color: ageGroup?.label === g.label ? "#FFF" : colors.secondaryForeground }]}>{g.label}</Text>
                {ageGroup?.label === g.label ? <Feather name="check" color="#FFF" size={14} /> : null}
              </Pressable>
            ))}
          </View>

          {ageGroup !== null && (
            <>
              <FormLabel text="Preferred Age (optional)" />
              <Text style={[localStyles.formHint, { color: colors.mutedForeground }]}>Select a specific age within the group above, or leave blank.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.sportPickerScroll}>
                {agesInGroup(ageGroup).map((age) => (
                  <Pressable key={age} onPress={() => setPreferredAge(preferredAge === age ? null : age)} style={({ pressed }) => [localStyles.agePill, { backgroundColor: preferredAge === age ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
                    <Text style={[localStyles.agePillText, { color: preferredAge === age ? "#FFF" : colors.secondaryForeground }]}>{age}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {showCoachTitle ? (
            <>
              <FormLabel text="Coach Title" required />
              <Text style={[localStyles.formHint, { color: colors.mutedForeground }]}>Select one coach title only.</Text>
              <View style={localStyles.pillRow}>
                {coachTitles.map((item) => <Pill key={item} label={item} active={coachTitle === item} onPress={() => setCoachTitle(item)} />)}
              </View>
            </>
          ) : (
            <>
              <FormLabel text="Position(s)" />
              <Text style={[localStyles.formHint, { color: colors.mutedForeground }]}>Select all that apply.</Text>
              <View style={localStyles.pillRow}>
                {positionOptions.map((p) => <Pill key={p} label={p} active={positions.includes(p)} onPress={() => togglePosition(p)} />)}
              </View>
            </>
          )}

          <Field label="Advert title" value={title} editable={false} placeholder="Auto-generated from your selections" />
          <Field label="Location *" value={suburb} onChangeText={setSuburb} placeholder="Suburb or town" />
          <FormLabel text="State" required />
          <View style={[localStyles.choiceRow, { marginBottom: 12 }]}>
            {AU_STATES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setState(item)}
                style={({ pressed }) => [
                  localStyles.choice,
                  {
                    backgroundColor: state === item ? colors.primary : colors.secondary,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[localStyles.choiceText, { color: state === item ? "#FFFFFF" : colors.secondaryForeground }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Level" value={level} onChangeText={setLevel} placeholder="Beginner, amateur, semi-pro, elite" />

          {showPlayerDesc && (
            <Field label="In 100 words or less, describe what type of player you are" value={playerDescription} onChangeText={(t) => { const words = t.trim().split(/\s+/).filter(Boolean); if (words.length <= 100) setPlayerDescription(t); }} placeholder="Describe your style, strengths and what you bring to a team…" multiline />
          )}

          {showClubDesc && (
            <Field label="In 100 words or less, describe what type of player you are looking for" value={playerDescription} onChangeText={(t) => { const words = t.trim().split(/\s+/).filter(Boolean); if (words.length <= 100) setPlayerDescription(t); }} placeholder="Describe the player profile, attitude and skills required…" multiline />
          )}

          <Field label="Additional Details" value={description} onChangeText={setDescription} placeholder="Describe the opportunity, player, club culture or requirements" multiline />

          {showSchedule && (
            <>
              <View style={[localStyles.sectionDivider, { backgroundColor: colors.border }]} />
              <Text style={[localStyles.subSectionTitle, { color: colors.foreground }]}>{isPlayerLooking ? "Available Training Days" : "Training Days"}</Text>

              <DayPicker label={isPlayerLooking ? "Available training days" : "Training days"} selected={trainingDays} onToggle={(d) => setTrainingDays(toggleDay(trainingDays, d))} tbd={trainingTbd} onTbdToggle={() => { setTrainingTbd(!trainingTbd); setTrainingDays([]); }} />
              <TimeRow label={isPlayerLooking ? "Available training times" : "Training times"} from={trainingFrom} to={trainingTo} onFromChange={setTrainingFrom} onToChange={setTrainingTo} disabled={trainingTbd} />

              <View style={[localStyles.sectionDivider, { backgroundColor: colors.border }]} />
              <Text style={[localStyles.subSectionTitle, { color: colors.foreground }]}>{isPlayerLooking ? "Available Game Days" : "Game Days"}</Text>

              <DayPicker label={isPlayerLooking ? "Available game days" : "Game days"} selected={gameDays} onToggle={(d) => setGameDays(toggleDay(gameDays, d))} tbd={gameTbd} onTbdToggle={() => { setGameTbd(!gameTbd); setGameDays([]); }} />
              <TimeRow label={isPlayerLooking ? "Available game times" : "Game times"} from={gameFrom} to={gameTo} onFromChange={setGameFrom} onToChange={setGameTo} disabled={gameTbd} />
            </>
          )}

          {showClubFees && (
            <>
              <View style={[localStyles.sectionDivider, { backgroundColor: colors.border }]} />
              <Text style={[localStyles.subSectionTitle, { color: colors.foreground }]}>Season Fees & Registration</Text>

              <CheckRow label="Free / Scholarship (no fees)" value={feesFree} onToggle={() => { setFeesFree(!feesFree); setFeesNegotiable(false); setSeasonFeesText(""); }} />

              {!feesFree && (
                <>
                  <FormLabel text="Season fees (AUD)" />
                  <View style={localStyles.feeRow}>
                    <View style={[localStyles.feeCurrencyBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[localStyles.feeCurrencyText, { color: colors.secondaryForeground }]}>AUD $</Text>
                    </View>
                    <TextInput value={seasonFeesText} onChangeText={(t) => setSeasonFeesText(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.mutedForeground} style={[localStyles.feeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, flex: 1 }]} />
                    {feesNegotiable && seasonFeesText.trim() ? <View style={[localStyles.nearOfferBadge, { backgroundColor: colors.secondary }]}><Text style={[localStyles.nearOfferText, { color: colors.secondaryForeground }]}>or near offer</Text></View> : null}
                  </View>
                  <CheckRow label="Negotiable (or near offer)" value={feesNegotiable} onToggle={() => setFeesNegotiable(!feesNegotiable)} />
                </>
              )}

              <CheckRow label="Trial required before joining" value={trialRequired} onToggle={() => setTrialRequired(!trialRequired)} />
            </>
          )}

          <View style={{ marginTop: 12 }}>
            {submitted ? <Text style={[localStyles.success, { color: colors.primary }]}>{editingId ? "Advert updated." : "Advert posted and visible in Discover."}</Text> : null}
            {!ageGroup && <Text style={[localStyles.formHint, { color: "#D9534F", marginBottom: 6 }]}>* Age Group is required</Text>}
            {showSchedule && !trainingDaysOk && <Text style={[localStyles.formHint, { color: "#D9534F", marginBottom: 6 }]}>* Select training days or mark as TBD</Text>}
            {showSchedule && !gameDaysOk && <Text style={[localStyles.formHint, { color: "#D9534F", marginBottom: 6 }]}>* Select game days or mark as TBD</Text>}
            <PrimaryButton label={editingId ? "Save changes" : "Publish advert"} icon={editingId ? "check" : "send"} onPress={submit} disabled={!canSubmit} />
            {editingId ? (
              <Pressable onPress={cancelEdit} style={({ pressed }) => [localStyles.cancelEditBtn, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[localStyles.cancelEditText, { color: colors.mutedForeground }]}>Cancel edit</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <SectionTitle title="Your active adverts" />
        {myAdverts.length ? (
          <FlatList
            data={myAdverts}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MyAdvertCard advert={item} onPress={() => setSelectedMyAdvert(item)} />}
          />
        ) : (
          <View style={[localStyles.emptyMini, { backgroundColor: colors.secondary }]}>
            <Text style={[localStyles.emptyMiniText, { color: colors.secondaryForeground }]}>Your posted adverts will appear here.</Text>
          </View>
        )}
      </ScrollView>

      {selectedMyAdvert ? (
        <MyAdvertDetail
          advert={selectedMyAdvert}
          onClose={() => setSelectedMyAdvert(null)}
          onEdit={() => loadAdvertForEdit(selectedMyAdvert)}
        />
      ) : null}
    </ScreenShell>
  );
}

const localStyles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  roleBadgeText: { fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  sportHeader: { borderWidth: 1, borderRadius: 26, padding: 18 },
  sportHeaderKicker: { fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  sportHeaderTitle: { fontWeight: "800", fontSize: 25, letterSpacing: -0.5, marginTop: 4 },
  formCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 4 },
  formTitle: { fontWeight: "700", fontSize: 18, marginBottom: 4 },
  formLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  formHint: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  sportPickerScroll: { gap: 8, paddingRight: 20, paddingVertical: 8 },
  sportChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  sportChipText: { fontWeight: "800", fontSize: 13 },
  ageGroupRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
  ageGroupText: { fontWeight: "600", fontSize: 14 },
  agePill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  agePillText: { fontWeight: "700", fontSize: 14 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkLabel: { fontWeight: "500", fontSize: 14, flex: 1 },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  dayChipText: { fontWeight: "700", fontSize: 13 },
  timeRowInner: { flexDirection: "row", gap: 10 },
  timeSubLabel: { fontWeight: "600", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  timeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, fontWeight: "500", fontSize: 15 },
  sectionDivider: { height: 1, marginVertical: 14, opacity: 0.5 },
  subSectionTitle: { fontWeight: "700", fontSize: 16, marginBottom: 4 },
  feeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  feeCurrencyBadge: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  feeCurrencyText: { fontWeight: "700", fontSize: 14 },
  feeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, fontWeight: "500", fontSize: 15 },
  nearOfferBadge: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12 },
  nearOfferText: { fontWeight: "600", fontSize: 12 },
  success: { fontWeight: "700", fontSize: 13, marginBottom: 8 },
  myCard: { borderWidth: 1, borderRadius: 22, overflow: "hidden", marginBottom: 10 },
  expiryRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  expiryText: { fontWeight: "700", fontSize: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 4, paddingHorizontal: 16 },
  cardType: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  cardDistance: { fontWeight: "600", fontSize: 12 },
  cardTitle: { fontWeight: "700", fontSize: 17, marginBottom: 4, paddingHorizontal: 16 },
  cardText: { fontWeight: "500", fontSize: 14, paddingHorizontal: 16 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  cardFooterText: { fontWeight: "500", fontSize: 12 },
  editingBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 18 },
  editingBannerText: { fontWeight: "600", fontSize: 13, flex: 1 },
  cancelEditBtn: { marginTop: 10, alignItems: "center", padding: 10 },
  cancelEditText: { fontWeight: "600", fontSize: 14 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: "92%", overflow: "hidden" },
  detailExpiryBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  detailExpiryText: { fontWeight: "700", fontSize: 13, flex: 1 },
  detailScroll: { paddingHorizontal: 22, paddingBottom: 40, gap: 4 },
  detailTypeLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16 },
  detailTitle: { fontWeight: "700", fontSize: 26, lineHeight: 31, letterSpacing: -0.5, marginTop: 4 },
  detailChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontWeight: "700", fontSize: 12 },
  detailSection: { gap: 4, marginTop: 10 },
  detailLabel: { fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
  detailValue: { fontWeight: "600", fontSize: 15, lineHeight: 21 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontWeight: "600", fontSize: 12 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: 18, marginTop: 12 },
  editButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: 18, borderWidth: 1.5, marginTop: 10 },
  deleteButtonText: { fontWeight: "700", fontSize: 16 },
  deleteConfirmBox: { borderWidth: 1.5, borderRadius: 18, padding: 16, marginTop: 10, gap: 12 },
  deleteConfirmText: { fontWeight: "600", fontSize: 14, color: "#7F1D1D", lineHeight: 20 },
  deleteConfirmRow: { flexDirection: "row", gap: 10 },
  deleteConfirmCancel: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: 14 },
  deleteConfirmCancelText: { fontWeight: "700", fontSize: 14 },
  deleteConfirmYes: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 46, borderRadius: 14, backgroundColor: "#D9534F" },
  deleteConfirmYesText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  emptyMini: { borderRadius: 20, padding: 18 },
  emptyMiniText: { fontWeight: "600", textAlign: "center" },
});