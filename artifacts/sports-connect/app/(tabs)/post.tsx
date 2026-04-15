import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Pill, PrimaryButton, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { Advert, AccountRole, useSportsConnect } from "@/context/SportsConnectContext";
import { allSportsFilterName, getSportTheme } from "@/constants/sports";
import { useColors } from "@/hooks/useColors";

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

function MyAdvertCard({ advert }: { advert: Advert }) {
  const colors = useColors();
  const { approvedSports } = useSportsConnect();
  const theme = getSportTheme(advert.sport, approvedSports);
  return (
    <View style={[styles.myCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardType, { color: theme.primary }]}>{advert.type === "players-wanted" ? "Players Wanted for Team" : advert.type === "club-trials" ? "Club Trials Info" : advert.type === "coach-wanted" ? "Coach Wanted for Team" : advert.type === "coach-looking" ? "Coach looking for Club" : "Player looking for Club"}</Text>
        <Text style={[styles.cardDistance, { color: colors.mutedForeground }]}>{advert.distanceKm} km</Text>
      </View>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{advert.title}</Text>
      <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{advert.sport} · {advert.location}</Text>
    </View>
  );
}

export default function PostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createAdvert, adverts, activeProfile, setActiveProfile, clubProfile, playerProfile, approvedSports, selectedSport, setSelectedSport } = useSportsConnect();
  const [type, setType] = useState<Advert["type"]>("player-looking");
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState(selectedSport === allSportsFilterName ? approvedSports[0].name : selectedSport);
  const [location, setLocation] = useState(playerProfile.location);
  const [level, setLevel] = useState("Competitive amateur");
  const [availability, setAvailability] = useState("Evenings and weekends");
  const [needs, setNeeds] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const ownerName = activeProfile === "club" ? clubProfile.name : playerProfile.name;
  const myAdverts = adverts.filter((advert) => advert.postedBy === ownerName);
  const canSubmit = title.trim().length > 4 && sport.trim().length > 1 && location.trim().length > 1 && description.trim().length > 10;
  const availableTypes = advertTypesByRole[activeProfile];
  const activeTheme = getSportTheme(sport, approvedSports);

  const submit = () => {
    if (!canSubmit) return;
    createAdvert({ type, title, sport, location, level, availability, needs: needs || (type === "players-wanted" ? "Open to suitable players" : type === "club-trials" ? "Trial details" : type === "coach-wanted" ? "Looking for an experienced coach" : "Looking for the right club"), description });
    setSelectedSport(sport);
    setTitle("");
    setNeeds("");
    setDescription("");
    setSubmitted(true);
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>Post advert</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Post Your Advertisement</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.pitchSoft }]}>
            <Feather name={activeProfile === "club" ? "shield" : "user"} color={colors.primary} size={16} />
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{activeProfile}</Text>
          </View>
        </View>

        <View style={[styles.sportHeader, { backgroundColor: activeTheme.background, borderColor: activeTheme.soft }]}>
          <Text style={[styles.sportHeaderKicker, { color: activeTheme.primary }]}>Posting under</Text>
          <Text style={[styles.sportHeaderTitle, { color: activeTheme.text }]}>{sport}</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: activeTheme.soft }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Advert type</Text>
          <View style={styles.pillRow}>
            {availableTypes.map((item) => (
              <Pill key={item.value} label={item.label} active={type === item.value} onPress={() => setType(item.value)} />
            ))}
          </View>
          <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportPickerScroll}>
            {approvedSports.map((item) => (
              <Pressable key={item.name} onPress={() => setSport(item.name)} style={({ pressed }) => [styles.sportChoice, { backgroundColor: sport === item.name ? item.button : item.soft, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[styles.sportChoiceText, { color: sport === item.name ? "#FFFFFF" : item.text }]}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Field label="Advert title" value={title} onChangeText={setTitle} placeholder="e.g. Striker wanted for local Saturday comp" />
          <Field label="Location" value={location} onChangeText={setLocation} placeholder="Town or area" />
          <Field label="Level" value={level} onChangeText={setLevel} placeholder="Beginner, amateur, semi-pro" />
          <Field label="Availability" value={availability} onChangeText={setAvailability} placeholder="Training and match availability" />
          <Field label={type === "players-wanted" ? "Positions needed" : type === "club-trials" ? "Trial details" : type === "coach-wanted" ? "Coach requirements" : "What you want"} value={needs} onChangeText={setNeeds} placeholder="Short summary" />
          <Field label="Details" value={description} onChangeText={setDescription} placeholder="Describe the opportunity, player, club culture or requirements" multiline />
          {submitted ? <Text style={[styles.success, { color: colors.primary }]}>Advert posted and visible in Discover.</Text> : null}
          <PrimaryButton label="Publish advert" icon="send" onPress={submit} disabled={!canSubmit} />
        </View>

        <SectionTitle title="Your active adverts" />
        {myAdverts.length ? (
          <FlatList data={myAdverts} scrollEnabled={false} keyExtractor={(item) => item.id} renderItem={({ item }) => <MyAdvertCard advert={item} />} />
        ) : (
          <Pressable style={[styles.emptyMini, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.emptyMiniText, { color: colors.secondaryForeground }]}>Your posted adverts will appear here.</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  roleBadgeText: { fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sportHeader: { borderWidth: 1, borderRadius: 26, padding: 18 },
  sportHeaderKicker: { fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  sportHeaderTitle: { fontWeight: "800", fontSize: 25, letterSpacing: -0.5, marginTop: 4 },
  formCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 4 },
  formTitle: { fontWeight: "700", fontSize: 18, marginBottom: 4 },
  formLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },
  sportPickerScroll: { gap: 8, paddingRight: 20, paddingVertical: 8 },
  sportChoice: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  sportChoiceText: { fontWeight: "800", fontSize: 13 },
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
