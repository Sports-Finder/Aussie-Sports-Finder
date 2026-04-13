import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Pill, PrimaryButton, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { Advert, useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

function MyAdvertCard({ advert }: { advert: Advert }) {
  const colors = useColors();
  return (
    <View style={[styles.myCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardType, { color: colors.primary }]}>{advert.type === "players-wanted" ? "Players wanted" : "Player available"}</Text>
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
  const { createAdvert, adverts, activeProfile, setActiveProfile, clubProfile, playerProfile } = useSportsConnect();
  const [type, setType] = useState<"player-looking" | "players-wanted">("player-looking");
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("Football");
  const [location, setLocation] = useState(playerProfile.location);
  const [level, setLevel] = useState("Competitive amateur");
  const [availability, setAvailability] = useState("Evenings and weekends");
  const [needs, setNeeds] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const ownerName = activeProfile === "club" ? clubProfile.name : playerProfile.name;
  const myAdverts = adverts.filter((advert) => advert.postedBy === ownerName);
  const canSubmit = title.trim().length > 4 && sport.trim().length > 1 && location.trim().length > 1 && description.trim().length > 10;

  const submit = () => {
    if (!canSubmit) return;
    createAdvert({ type, title, sport, location, level, availability, needs: needs || (type === "players-wanted" ? "Open to suitable players" : "Looking for the right club"), description });
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
            <Text style={[styles.title, { color: colors.foreground }]}>Find the right match</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.pitchSoft }]}>
            <Feather name={activeProfile === "club" ? "shield" : "user"} color={colors.primary} size={16} />
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{activeProfile}</Text>
          </View>
        </View>

        <View style={styles.pillRow}>
          <Pill label="Post as player" active={activeProfile === "player"} onPress={() => setActiveProfile("player")} />
          <Pill label="Post as club" active={activeProfile === "club"} onPress={() => setActiveProfile("club")} />
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Advert type</Text>
          <View style={styles.pillRow}>
            <Pill label="Player looking" active={type === "player-looking"} onPress={() => setType("player-looking")} />
            <Pill label="Players wanted" active={type === "players-wanted"} onPress={() => setType("players-wanted")} />
          </View>
          <Field label="Advert title" value={title} onChangeText={setTitle} placeholder="e.g. Striker wanted for Sunday league" />
          <Field label="Sport" value={sport} onChangeText={setSport} placeholder="Football, rugby, netball" />
          <Field label="Location" value={location} onChangeText={setLocation} placeholder="Town or area" />
          <Field label="Level" value={level} onChangeText={setLevel} placeholder="Beginner, amateur, semi-pro" />
          <Field label="Availability" value={availability} onChangeText={setAvailability} placeholder="Training and match availability" />
          <Field label={type === "players-wanted" ? "Positions needed" : "What you want"} value={needs} onChangeText={setNeeds} placeholder="Short summary" />
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
  formCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 4 },
  formTitle: { fontWeight: "700", fontSize: 18, marginBottom: 4 },
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
