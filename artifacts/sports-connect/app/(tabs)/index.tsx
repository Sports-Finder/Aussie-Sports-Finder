import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Advert, useSportsConnect } from "@/context/SportsConnectContext";
import { IconButton, Pill, PrimaryButton, ScreenShell, SectionTitle } from "@/components/SportsUI";
import { allSportsFilterName, getSportTheme } from "@/constants/sports";
import { useColors } from "@/hooks/useColors";
import { openMapApp } from "@/utils/mapLinks";

const heroImage = require("@/assets/images/training-hero.png");

type Filter = "all" | "players-wanted" | "player-looking" | "near";

const australianStates = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
type AustralianStateFilter = (typeof australianStates)[number];

function AdvertCard({ advert, onPress }: { advert: Advert; onPress: () => void }) {
  const colors = useColors();
  const icon = advert.type === "players-wanted" ? "shield" : "user";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.adCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}>
      <View style={[styles.adIcon, { backgroundColor: colors.pitchSoft }]}>
        <Feather name={icon} color={colors.primary} size={20} />
      </View>
      <View style={styles.adBody}>
        <View style={styles.adMetaRow}>
          <Text style={[styles.adMeta, { color: colors.primary }]}>{advert.sport}</Text>
          <Text style={[styles.adDistance, { color: colors.mutedForeground }]}>{advert.distanceKm} km</Text>
        </View>
        <Text style={[styles.adTitle, { color: colors.foreground }]}>{advert.title}</Text>
        <Text style={[styles.adText, { color: colors.mutedForeground }]}>{advert.postedBy} · {advert.location}</Text>
      </View>
    </Pressable>
  );
}

function AdvertDetail({ advert, onClose }: { advert: Advert; onClose: () => void }) {
  const colors = useColors();
  const { connectOnAdvert } = useSportsConnect();
  const mapQuery = `${advert.postedBy} ${advert.location} Australia`;
  const connect = () => {
    const conversationId = connectOnAdvert(advert);
    onClose();
    router.push("/messages");
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          <View style={styles.modalTop}>
            <View style={[styles.modalIcon, { backgroundColor: colors.pitchSoft }]}>
              <Feather name={advert.postedByType === "club" ? "shield" : "user"} color={colors.primary} size={24} />
            </View>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <Text style={[styles.detailType, { color: colors.primary }]}>{advert.type === "players-wanted" ? "Players wanted" : "Player looking for club"}</Text>
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>{advert.title}</Text>
          <View style={styles.detailGrid}>
            <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.sport}</Text></View>
            <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}><Text style={[styles.detailChipText, { color: colors.secondaryForeground }]}>{advert.level}</Text></View>
            <View style={[styles.detailChip, { backgroundColor: colors.amberSoft }]}><Text style={[styles.detailChipText, { color: colors.accentForeground }]}>{advert.distanceKm} km away</Text></View>
          </View>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Posted by</Text>
          <Text style={[styles.detailCopy, { color: colors.foreground }]}>{advert.postedBy} in {advert.location}</Text>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Availability</Text>
          <Text style={[styles.detailCopy, { color: colors.foreground }]}>{advert.availability}</Text>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Needs</Text>
          <Text style={[styles.detailCopy, { color: colors.foreground }]}>{advert.needs}</Text>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>About</Text>
          <Text style={[styles.detailParagraph, { color: colors.foreground }]}>{advert.description}</Text>
          {advert.postedByType === "club" ? (
            <View style={styles.mapActions}>
              <Pressable onPress={() => openMapApp("apple", mapQuery)} style={({ pressed }) => [styles.mapAction, { backgroundColor: colors.navy, opacity: pressed ? 0.75 : 1 }]}>
                <Feather name="map" color="#FFFFFF" size={17} />
                <Text style={styles.mapActionText}>Apple Maps</Text>
              </Pressable>
              <Pressable onPress={() => openMapApp("google", mapQuery)} style={({ pressed }) => [styles.mapAction, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
                <Feather name="navigation" color="#FFFFFF" size={17} />
                <Text style={styles.mapActionText}>Google Maps</Text>
              </Pressable>
            </View>
          ) : null}
          <PrimaryButton label="Agree to connect privately" icon="message-circle" onPress={connect} />
        </View>
      </View>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { adverts, notificationSettings, toggleNotifications, setNotificationRadius, approvedSports, selectedSport, setSelectedSport, requestSport } = useSportsConnect();
  const [filter, setFilter] = useState<Filter>("all");
  const [stateFilter, setStateFilter] = useState<AustralianStateFilter>("All");
  const [selected, setSelected] = useState<Advert | null>(null);
  const [sportRequest, setSportRequest] = useState("");
  const activeTheme = selectedSport === allSportsFilterName ? null : getSportTheme(selectedSport, approvedSports);

  const filtered = useMemo(() => adverts.filter((advert) => {
    const matchesSport = selectedSport === allSportsFilterName || advert.sport === selectedSport;
    if (!matchesSport) return false;
    const matchesState = stateFilter === "All" || advert.location.includes(stateFilter);
    if (!matchesState) return false;
    if (filter === "all") return true;
    if (filter === "near") return advert.distanceKm <= notificationSettings.radiusKm;
    return advert.type === filter;
  }), [adverts, filter, notificationSettings.radiusKm, selectedSport, stateFilter]);

  const nearCount = adverts.filter((advert) => advert.distanceKm <= notificationSettings.radiusKm).length;
  const submitSportRequest = () => {
    requestSport(sportRequest);
    setSportRequest("");
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 116 }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>Aussie Sports Club Finder</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Find your next club or player</Text>
          </View>
          <IconButton icon="bell" label="Notifications" onPress={toggleNotifications} />
        </View>

        <View style={[styles.sportPanel, { backgroundColor: activeTheme?.background ?? colors.card, borderColor: activeTheme?.soft ?? colors.border }]}>
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
            {approvedSports.map((sport) => (
              <Pressable key={sport.name} onPress={() => setSelectedSport(sport.name)} style={({ pressed }) => [styles.sportChip, { backgroundColor: selectedSport === sport.name ? sport.button : sport.soft, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[styles.sportChipText, { color: selectedSport === sport.name ? "#FFFFFF" : sport.text }]}>{sport.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.addSportRow}>
            <TextInput value={sportRequest} onChangeText={setSportRequest} placeholder="Add a sport for admin approval" placeholderTextColor={colors.mutedForeground} style={[styles.addSportInput, { backgroundColor: colors.background, borderColor: activeTheme?.soft ?? colors.border, color: colors.foreground }]} />
            <Pressable onPress={submitSportRequest} style={({ pressed }) => [styles.addSportButton, { backgroundColor: activeTheme?.button ?? colors.primary, opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="plus" color="#FFFFFF" size={18} />
            </Pressable>
          </View>
        </View>

        <ImageBackground source={heroImage} imageStyle={styles.heroImage} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Local sport moves fast</Text>
            <Text style={styles.heroText}>Connect with clubs and players nearby, then keep the conversation private once both sides agree.</Text>
          </View>
        </ImageBackground>

        <View style={[styles.alertCard, { backgroundColor: colors.navy }]}>
          <View style={styles.alertTextWrap}>
            <Text style={styles.alertTitle}>{notificationSettings.enabled ? "Nearby advert alerts are on" : "Turn on nearby advert alerts"}</Text>
            <Text style={styles.alertText}>{nearCount} adverts are within {notificationSettings.radiusKm} km of {notificationSettings.locationLabel}.</Text>
          </View>
          <Switch value={notificationSettings.enabled} onValueChange={toggleNotifications} trackColor={{ false: "#3E554E", true: colors.primary }} thumbColor={notificationSettings.enabled ? colors.accent : "#FFFFFF"} />
        </View>

        <View style={styles.radiusRow}>
          {[10, 25, 50].map((radius) => <Pill key={radius} label={`${radius} km`} active={notificationSettings.radiusKm === radius} onPress={() => setNotificationRadius(radius)} />)}
        </View>

        <SectionTitle title={`${selectedSport === allSportsFilterName ? "All sports" : selectedSport} adverts`} action={`${filtered.length} live`} />
        <View style={styles.filterRow}>
          <Pill label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <Pill label="Players wanted" active={filter === "players-wanted"} onPress={() => setFilter("players-wanted")} />
          <Pill label="Players looking" active={filter === "player-looking"} onPress={() => setFilter("player-looking")} />
          <Pill label="Near me" active={filter === "near"} onPress={() => setFilter("near")} />
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
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" color={activeTheme?.primary ?? colors.primary} size={24} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No adverts in this sport yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try another sport or post the first advert for this category.</Text>
          </View>
        ) : null}
      </ScrollView>
      {selected ? <AdvertDetail advert={selected} onClose={() => setSelected(null)} /> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 18 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 34, lineHeight: 38, letterSpacing: -1, maxWidth: 290, marginTop: 4 },
  hero: { height: 178, borderRadius: 30, overflow: "hidden", justifyContent: "flex-end" },
  heroImage: { borderRadius: 30 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,24,22,0.45)" },
  heroContent: { padding: 20 },
  heroTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 24, letterSpacing: -0.3 },
  heroText: { color: "#E7F4EF", fontWeight: "500", fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 300 },
  sportPanel: { borderWidth: 1, borderRadius: 28, padding: 16, gap: 12 },
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
  alertCard: { borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  alertTextWrap: { flex: 1 },
  alertTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 17 },
  alertText: { color: "#BFD4CD", fontWeight: "500", fontSize: 13, lineHeight: 19, marginTop: 4 },
  radiusRow: { flexDirection: "row" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stateBlock: { gap: 8 },
  stateLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 },
  stateScroll: { paddingRight: 20 },
  adCard: { borderWidth: 1, borderRadius: 26, padding: 14, marginBottom: 12, flexDirection: "row", gap: 13 },
  adIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  adBody: { flex: 1 },
  adMetaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  adMeta: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  adDistance: { fontWeight: "700", fontSize: 12 },
  adTitle: { fontWeight: "700", fontSize: 17, lineHeight: 22 },
  adText: { fontWeight: "500", fontSize: 14, marginTop: 6 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 22, gap: 10, maxHeight: "88%" },
  modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalIcon: { width: 54, height: 54, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  detailType: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8 },
  detailTitle: { fontWeight: "700", fontSize: 27, lineHeight: 32, letterSpacing: -0.6 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 6 },
  detailChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  detailChipText: { fontWeight: "700", fontSize: 12 },
  detailLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 4 },
  detailCopy: { fontWeight: "600", fontSize: 15, lineHeight: 21 },
  detailParagraph: { fontWeight: "500", fontSize: 15, lineHeight: 22, marginBottom: 8 },
  mapActions: { flexDirection: "row", gap: 10, marginBottom: 4 },
  mapAction: { flex: 1, minHeight: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  mapActionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  emptyState: { borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", gap: 8 },
  emptyTitle: { fontWeight: "800", fontSize: 17 },
  emptyText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
