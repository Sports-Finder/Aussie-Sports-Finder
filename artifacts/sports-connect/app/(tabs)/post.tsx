import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  guardian: [{ value: "player-looking", label: "Player looking for Club" }],
  coach: [{ value: "coach-looking", label: "Coach looking for Club" }],
  club: [
    { value: "players-wanted", label: "Players Wanted for Team" },
    { value: "club-trials", label: "Club Trials Info" },
    { value: "coach-wanted", label: "Coach Wanted for Team" },
  ],
};

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

function MyAdvertCard({ advert }: { advert: Advert }) {
  const colors = useColors();
  const { approvedSports } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  const typeLabel = advert.type === "players-wanted" ? "Players Wanted for Team" : advert.type === "club-trials" ? "Club Trials Info" : advert.type === "coach-wanted" ? "Coach Wanted for Team" : advert.type === "coach-looking" ? "Coach looking for Club" : "Player looking for Club";
  return (
    <View style={[localStyles.myCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={localStyles.cardTop}>
        <Text style={[localStyles.cardType, { color: theme.primary }]}>{typeLabel}</Text>
        <Text style={[localStyles.cardDistance, { color: colors.mutedForeground }]}>{advert.distanceKm} km</Text>
      </View>
      <Text style={[localStyles.cardTitle, { color: colors.foreground }]}>{advert.title}</Text>
      <Text style={[localStyles.cardText, { color: colors.mutedForeground }]}>{advert.sport} · {advert.location}</Text>
      {advert.ageGroup ? <Text style={[localStyles.cardText, { color: colors.mutedForeground, marginTop: 2 }]}>{advert.ageGroup}</Text> : null}
    </View>
  );
}

export default function PostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createAdvert, adverts, activeProfile, clubProfile, playerProfile, approvedSports, selectedSport, setSelectedSport, currentAccount } = useSportsConnect();

  const allowedSports = activeProfile === "club"
    ? [currentAccount?.defaultSport || clubProfile.sport].filter(Boolean)
    : (currentAccount?.sports?.length ? currentAccount.sports : [playerProfile.sports.split(", ")[0] || selectedSport]).filter(Boolean);

  const [type, setType] = useState<Advert["type"]>(advertTypesByRole[activeProfile][0].value);
  const [sport, setSport] = useState(allowedSports[0] || selectedSport);
  const [suburb, setSuburb] = useState(playerProfile.location);
  const [state, setState] = useState("");
  const [level, setLevel] = useState("Competitive amateur");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [preferredAge, setPreferredAge] = useState<number | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
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
    const nextSport = allowedSports[0] || selectedSport;
    setSport((current) => (allowedSports.includes(current) ? current : nextSport));
    setPositions([]);
  }, [allowedSports, selectedSport]);

  useEffect(() => {
    const sportLabel = sport.includes(" (") ? sport.split(" (")[0] : sport;
    const roleLabel =
      type === "players-wanted" ? "Players wanted" :
      type === "club-trials" ? "Club trials" :
      type === "coach-wanted" ? "Coach wanted" :
      type === "coach-looking" ? "Coach seeking club" :
      "Player seeking club";
    const ageLabel = ageGroup ? ageGroup.label.replace(/\(.*\)/, "").trim() : "";
    const positionLabel = positions.length === 1 ? positions[0] : "";
    const levelLabel = level.trim() && level !== "Competitive amateur" ? level.trim() : "";
    const locationLabel = [suburb.trim(), state.trim()].filter(Boolean).join(", ");
    const ending = locationLabel ? `in ${locationLabel}` : "";
    const parts = [ageLabel, positionLabel, levelLabel, roleLabel, sportLabel].filter(Boolean);
    const titleBody = parts.join(" ").replace(/\s+/g, " ").trim().split(" ").slice(0, 10).join(" ");
    setTitle([titleBody, ending].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
  }, [sport, type, ageGroup, positions, level, suburb, state]);

  const ownerName = activeProfile === "club" ? clubProfile.name : playerProfile.name;
  const myAdverts = adverts.filter((a) => a.postedBy === ownerName);
  const activeTheme = getSportTheme(sport, approvedSports);
  const sportChoices = allowedSports.length ? approvedSports.filter((s) => allowedSports.includes(s.name)) : approvedSports;
  const availableTypes = advertTypesByRole[activeProfile];
  const positionOptions = getPositions(sport);

  const isPlayerLooking = type === "player-looking";
  const isCoachLooking = type === "coach-looking";
  const isPlayersWanted = type === "players-wanted";
  const isClubTrials = type === "club-trials";
  const isCoachWanted = type === "coach-wanted";
  const showPlayerDesc = isPlayerLooking || isCoachLooking;
  const showClubDesc = isPlayersWanted || isClubTrials || isCoachWanted;
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
    createAdvert({
      type,
      title,
      sport,
      location: [suburb.trim(), state.trim()].filter(Boolean).join(", "),
      level,
      availability: trainingTbd && gameTbd ? "TBD" : [trainingDays.join("/") || "TBD", gameDays.join("/") || "TBD"].join(" | "),
      description,
      needs: isPlayersWanted ? "Players wanted" : isClubTrials ? "Club trials" : isCoachWanted ? "Coach wanted" : "Player looking",
      ageGroup: ageGroup.label,
      preferredAge: preferredAge ?? undefined,
      positions,
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
    });
    setSelectedSport(sport);
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
      <ScrollView contentContainerStyle={[localStyles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]} keyboardShouldPersistTaps="handled">
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

          <FormLabel text="Position(s)" />
          <Text style={[localStyles.formHint, { color: colors.mutedForeground }]}>Select all that apply.</Text>
          <View style={localStyles.pillRow}>
            {positionOptions.map((p) => <Pill key={p} label={p} active={positions.includes(p)} onPress={() => togglePosition(p)} />)}
          </View>

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
            {submitted ? <Text style={[localStyles.success, { color: colors.primary }]}>Advert posted and visible in Discover.</Text> : null}
            {!ageGroup && <Text style={[localStyles.formHint, { color: "#D9534F", marginBottom: 6 }]}>* Age Group is required</Text>}
            {showSchedule && !trainingDaysOk && <Text style={[localStyles.formHint, { color: "#D9534F", marginBottom: 6 }]}>* Select training days or mark as TBD</Text>}
            {showSchedule && !gameDaysOk && <Text style={[localStyles.formHint, { color: "#D9534F", marginBottom: 6 }]}>* Select game days or mark as TBD</Text>}
            <PrimaryButton label="Publish advert" icon="send" onPress={submit} disabled={!canSubmit} />
          </View>
        </View>

        <SectionTitle title="Your active adverts" />
        {myAdverts.length ? (
          <FlatList data={myAdverts} scrollEnabled={false} keyExtractor={(item) => item.id} renderItem={({ item }) => <MyAdvertCard advert={item} />} />
        ) : (
          <View style={[localStyles.emptyMini, { backgroundColor: colors.secondary }]}>
            <Text style={[localStyles.emptyMiniText, { color: colors.secondaryForeground }]}>Your posted adverts will appear here.</Text>
          </View>
        )}
      </ScrollView>
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
  myCard: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  cardType: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  cardDistance: { fontWeight: "600", fontSize: 12 },
  cardTitle: { fontWeight: "700", fontSize: 17, marginBottom: 5 },
  cardText: { fontWeight: "500", fontSize: 14 },
  emptyMini: { borderRadius: 20, padding: 18 },
  emptyMiniText: { fontWeight: "600", textAlign: "center" },
});