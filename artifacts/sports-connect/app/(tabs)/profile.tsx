import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Pill, PrimaryButton, ProfileAvatar, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";
import { openMapApp } from "@/utils/mapLinks";

const fallbackImage = require("@/assets/images/player-placeholder.png");

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProfile, setActiveProfile, playerProfile, clubProfile, updatePlayerProfile, updateClubProfile, pickProfileImage, profileImages, moderateImage, getImageUri, approvedSports, pendingSportRequests, moderateSportRequest, currentAccount, signOut, pendingHighlightLinks, moderateHighlightLink } = useSportsConnect();
  const [player, setPlayer] = useState(playerProfile);
  const [club, setClub] = useState(clubProfile);
  const pendingImages = profileImages.filter((image) => image.status === "pending");
  const pendingSports = pendingSportRequests.filter((request) => request.status === "pending");
  const pendingHighlights = pendingHighlightLinks.filter((link) => link.status === "pending");
  const playerImage = getImageUri(playerProfile.imageId, true);
  const clubImage = getImageUri(clubProfile.imageId, true);
  const clubMapQuery = `${club.name} ${club.mapAddress || club.location}`;

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

        {currentAccount ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{currentAccount.role === "club" ? currentAccount.clubName : currentAccount.role === "guardian" ? currentAccount.playerName : currentAccount.fullName}</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              {currentAccount.role === "guardian" ? `On Behalf of ${currentAccount.parentGuardianName}` : `${currentAccount.role} account`} · Default sport: {currentAccount.defaultSport}
            </Text>
            {currentAccount.dateOfBirth ? <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Age: {Math.max(0, new Date().getFullYear() - new Date(currentAccount.dateOfBirth).getFullYear())}</Text> : null}
            <PrimaryButton label="Sign out" icon="log-out" onPress={signOut} />
          </View>
        ) : null}

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
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Club sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportPickerScroll}>
            {approvedSports.map((sport) => (
              <Pressable key={sport.name} onPress={() => setClub((current) => ({ ...current, sport: sport.name }))} style={({ pressed }) => [styles.sportChoice, { backgroundColor: club.sport === sport.name ? sport.button : sport.soft, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[styles.sportChoiceText, { color: club.sport === sport.name ? "#FFFFFF" : sport.text }]}>{sport.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Field label="Suburb, city and state" value={club.location} onChangeText={(location) => setClub((current) => ({ ...current, location }))} />
          <Field label="Club ground or street address" value={club.mapAddress ?? ""} onChangeText={(mapAddress) => setClub((current) => ({ ...current, mapAddress }))} placeholder="e.g. Princes Park, Carlton North VIC" />
          <Field label="Club bio" value={club.bio} onChangeText={(bio) => setClub((current) => ({ ...current, bio }))} multiline />
          <View style={styles.mapButtons}>
            <Pressable onPress={() => openMapApp("apple", clubMapQuery)} style={({ pressed }) => [styles.mapButton, { backgroundColor: colors.navy, opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="map" color="#FFFFFF" size={17} />
              <Text style={styles.mapButtonText}>Apple Maps</Text>
            </Pressable>
            <Pressable onPress={() => openMapApp("google", clubMapQuery)} style={({ pressed }) => [styles.mapButton, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="navigation" color="#FFFFFF" size={17} />
              <Text style={styles.mapButtonText}>Google Maps</Text>
            </Pressable>
          </View>
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

        <SectionTitle title="Admin sport approvals" action={`${pendingSports.length} pending`} />
        <View style={[styles.adminCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.adminHeader}>
            <View style={[styles.adminIcon, { backgroundColor: colors.pitchSoft }]}>
              <Feather name="list" size={18} color={colors.primary} />
            </View>
            <View style={styles.profileCopy}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Requested sports</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Approved sports are added to the top-level filter list and can be used in new adverts.</Text>
            </View>
          </View>
          {pendingSports.length === 0 ? (
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>No sport requests need review right now.</Text>
          ) : pendingSports.map((request) => (
            <View key={request.id} style={[styles.reviewRow, { backgroundColor: colors.secondary }]}>
              <View style={styles.reviewCopy}>
                <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{request.name}</Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Pending admin approval</Text>
              </View>
              <Pressable onPress={() => moderateSportRequest(request.id, "approved")} style={[styles.reviewButton, { backgroundColor: colors.primary }]}>
                <Feather name="check" color="#FFFFFF" size={18} />
              </Pressable>
              <Pressable onPress={() => moderateSportRequest(request.id, "rejected")} style={[styles.reviewButton, { backgroundColor: colors.destructive }]}>
                <Feather name="x" color="#FFFFFF" size={18} />
              </Pressable>
            </View>
          ))}
        </View>

        <SectionTitle title="Admin highlight reel approvals" action={`${pendingHighlights.length} pending`} />
        <View style={[styles.adminCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.adminHeader}>
            <View style={[styles.adminIcon, { backgroundColor: colors.pitchSoft }]}>
              <Feather name="video" size={18} color={colors.primary} />
            </View>
            <View style={styles.profileCopy}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Highlight links</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Optional highlight reels stay pending until an admin approves them.</Text>
            </View>
          </View>
          {pendingHighlights.length === 0 ? (
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>No highlight reels need review right now.</Text>
          ) : pendingHighlights.map((link) => (
            <View key={link.id} style={[styles.reviewRow, { backgroundColor: colors.secondary }]}>
              <View style={styles.reviewCopy}>
                <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{link.owner}</Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]} numberOfLines={1}>{link.url}</Text>
              </View>
              <Pressable onPress={() => moderateHighlightLink(link.id, "approved")} style={[styles.reviewButton, { backgroundColor: colors.primary }]}>
                <Feather name="check" color="#FFFFFF" size={18} />
              </Pressable>
              <Pressable onPress={() => moderateHighlightLink(link.id, "rejected")} style={[styles.reviewButton, { backgroundColor: colors.destructive }]}>
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
  fieldLabel: { fontWeight: "600", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  sportPickerScroll: { gap: 8, paddingRight: 20, paddingBottom: 12 },
  sportChoice: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  sportChoiceText: { fontWeight: "800", fontSize: 13 },
  mapButtons: { flexDirection: "row", gap: 10, marginBottom: 12 },
  mapButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  mapButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
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
