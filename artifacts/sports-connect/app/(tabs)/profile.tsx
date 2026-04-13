import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Pill, PrimaryButton, ProfileAvatar, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

const fallbackImage = require("@/assets/images/player-placeholder.png");

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProfile, setActiveProfile, playerProfile, clubProfile, updatePlayerProfile, updateClubProfile, pickProfileImage, profileImages, moderateImage, getImageUri } = useSportsConnect();
  const [player, setPlayer] = useState(playerProfile);
  const [club, setClub] = useState(clubProfile);
  const pendingImages = profileImages.filter((image) => image.status === "pending");
  const playerImage = getImageUri(playerProfile.imageId, true);
  const clubImage = getImageUri(clubProfile.imageId, true);

  const save = () => {
    updatePlayerProfile(player);
    updateClubProfile(club);
    Alert.alert("Profiles saved", "Profile changes are now available in the app.");
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>Profiles and admin</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Trust starts here</Text>
        </View>

        <View style={styles.pillRow}>
          <Pill label="Player profile" active={activeProfile === "player"} onPress={() => setActiveProfile("player")} />
          <Pill label="Club profile" active={activeProfile === "club"} onPress={() => setActiveProfile("club")} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileTop}>
            <ProfileAvatar uri={playerImage} fallback={fallbackImage} size={72} />
            <View style={styles.profileCopy}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Player profile</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Images stay pending until an admin approves them.</Text>
            </View>
          </View>
          <Field label="Name" value={player.name} onChangeText={(name) => setPlayer((current) => ({ ...current, name }))} />
          <Field label="Sports" value={player.sports} onChangeText={(sports) => setPlayer((current) => ({ ...current, sports }))} />
          <Field label="Location" value={player.location} onChangeText={(location) => setPlayer((current) => ({ ...current, location }))} />
          <Field label="Bio" value={player.bio} onChangeText={(bio) => setPlayer((current) => ({ ...current, bio }))} multiline />
          <PrimaryButton label="Submit player image" icon="image" onPress={() => pickProfileImage("player")} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileTop}>
            <ProfileAvatar uri={clubImage} fallback={fallbackImage} size={72} />
            <View style={styles.profileCopy}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Club profile</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Clubs can maintain a profile and post multiple adverts.</Text>
            </View>
          </View>
          <Field label="Club name" value={club.name} onChangeText={(name) => setClub((current) => ({ ...current, name }))} />
          <Field label="Sport" value={club.sport} onChangeText={(sport) => setClub((current) => ({ ...current, sport }))} />
          <Field label="Location" value={club.location} onChangeText={(location) => setClub((current) => ({ ...current, location }))} />
          <Field label="Club bio" value={club.bio} onChangeText={(bio) => setClub((current) => ({ ...current, bio }))} multiline />
          <PrimaryButton label="Submit club image" icon="shield" onPress={() => pickProfileImage("club")} />
        </View>

        <PrimaryButton label="Save profile details" icon="check" onPress={save} />

        <SectionTitle title="Admin image moderation" action={`${pendingImages.length} pending`} />
        <View style={[styles.adminCard, { backgroundColor: colors.navy, borderColor: colors.navy }]}>
          <View style={styles.adminHeader}>
            <View style={[styles.adminIcon, { backgroundColor: colors.accent }]}>
              <Feather name="lock" size={18} color={colors.accentForeground} />
            </View>
            <View style={styles.profileCopy}>
              <Text style={[styles.adminTitle, { color: "#FFFFFF" }]}>Admin permissions</Text>
              <Text style={[styles.adminText, { color: "#B9CBC4" }]}>Only approved profile images become public. Pending uploads are visible here for review.</Text>
            </View>
          </View>
          {pendingImages.length === 0 ? (
            <Text style={[styles.adminText, { color: "#B9CBC4" }]}>No images need review right now.</Text>
          ) : pendingImages.map((image) => (
            <View key={image.id} style={[styles.reviewRow, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
              <ProfileAvatar uri={image.uri} fallback={fallbackImage} size={54} />
              <View style={styles.reviewCopy}>
                <Text style={[styles.reviewTitle, { color: "#FFFFFF" }]}>{image.owner} image</Text>
                <Text style={[styles.adminText, { color: "#B9CBC4" }]}>Pending review</Text>
              </View>
              <Pressable onPress={() => moderateImage(image.id, "approved")} style={[styles.reviewButton, { backgroundColor: colors.primary }]}>
                <Feather name="check" color="#FFFFFF" size={18} />
              </Pressable>
              <Pressable onPress={() => moderateImage(image.id, "rejected")} style={[styles.reviewButton, { backgroundColor: colors.destructive }]}>
                <Feather name="x" color="#FFFFFF" size={18} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 18 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { borderWidth: 1, borderRadius: 28, padding: 18 },
  profileTop: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 16 },
  profileCopy: { flex: 1 },
  cardTitle: { fontWeight: "700", fontSize: 19 },
  cardText: { fontWeight: "500", fontSize: 14, lineHeight: 20, marginTop: 3 },
  adminCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 14 },
  adminHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  adminIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  adminTitle: { fontWeight: "700", fontSize: 18 },
  adminText: { fontWeight: "500", fontSize: 13, lineHeight: 19 },
  reviewRow: { borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  reviewCopy: { flex: 1 },
  reviewTitle: { fontWeight: "700", fontSize: 15, textTransform: "capitalize" },
  reviewButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
