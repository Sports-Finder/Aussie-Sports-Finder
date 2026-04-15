import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, PrimaryButton, ProfileAvatar, SectionTitle } from "@/components/SportsUI";
import { SocialLinks, useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";
import { openMapApp } from "@/utils/mapLinks";

type Mode = "view" | "edit";

const fallbackImage = require("@/assets/images/player-placeholder.png");
const genders = ["Male", "Female", "Pref Not to Say"];
const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

function parseDobAge(dob?: string) {
  if (!dob) return null;
  const parts = dob.split("-");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function formatDate(date: Date) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("-");
}

const SOCIAL_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Instagram: "instagram",
  Facebook: "facebook",
  "X / Twitter": "twitter",
  TikTok: "music",
  Website: "globe",
  "Contact email": "mail",
  "Highlight reel": "play-circle",
};

function normaliseUrl(raw: string) {
  if (!raw.trim()) return "";
  if (raw.startsWith("mailto:")) return raw;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

async function openLink(raw: string) {
  const url = normaliseUrl(raw);
  if (!url) return;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Cannot open link", `Could not open: ${url}`);
    }
  } catch {
    Alert.alert("Error", "Something went wrong trying to open that link.");
  }
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, { backgroundColor: active ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[styles.choiceText, { color: active ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    playerProfile,
    clubProfile,
    updatePlayerProfile,
    updateClubProfile,
    pickProfileImage,
    profileImages,
    moderateImage,
    getImageUri,
    approvedSports,
    pendingSportRequests,
    moderateSportRequest,
    currentAccount,
    signOut,
    pendingHighlightLinks,
    moderateHighlightLink,
    isAdmin,
    adminSignOut,
    changeAdminPasscode,
    updateAccount,
  } = useSportsConnect();

  const [mode, setMode] = useState<Mode>("view");
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [draftDob, setDraftDob] = useState("");
  const [showChangePasscode, setShowChangePasscode] = useState(false);
  const [currentPasscodeInput, setCurrentPasscodeInput] = useState("");
  const [newPasscodeInput, setNewPasscodeInput] = useState("");

  const [playerBio, setPlayerBio] = useState(playerProfile.bio ?? "");
  const [guardianBio, setGuardianBio] = useState(currentAccount?.role === "guardian" ? currentAccount.bio ?? "" : "");
  const [coachBio, setCoachBio] = useState(currentAccount?.role === "coach" ? currentAccount.bio ?? "" : "");
  const [clubBio, setClubBio] = useState(clubProfile.bio ?? "");
  const [clubMapAddress, setClubMapAddress] = useState(clubProfile.mapAddress ?? "");
  const [suburb, setSuburb] = useState(currentAccount?.location ?? "");
  const [state, setState] = useState("");

  useEffect(() => {
    setPlayerBio(playerProfile.bio ?? "");
    setGuardianBio(currentAccount?.role === "guardian" ? currentAccount.bio ?? "" : "");
    setCoachBio(currentAccount?.role === "coach" ? currentAccount.bio ?? "" : "");
    setClubBio(clubProfile.bio ?? "");
    setClubMapAddress(clubProfile.mapAddress ?? "");
    setSuburb(currentAccount?.location ?? "");
  }, [currentAccount?.bio, currentAccount?.role, clubProfile, playerProfile]);

  const pendingImages = profileImages.filter((img) => img.status === "pending");
  const pendingSports = pendingSportRequests.filter((r) => r.status === "pending");
  const pendingHighlights = pendingHighlightLinks.filter((l) => l.status === "pending");
  const playerImage = getImageUri(playerProfile.imageId, true);
  const clubImage = getImageUri(clubProfile.imageId, true);
  const clubMapQuery = `${currentAccount?.clubName ?? ""} ${clubMapAddress || currentAccount?.clubAddress || currentAccount?.location || ""}`;

  const role = currentAccount?.role ?? "player";
  const isClub = role === "club";
  const isGuardian = role === "guardian";
  const isCoach = role === "coach";
  const age = parseDobAge(currentAccount?.dateOfBirth);
  const accountName = isClub
    ? currentAccount?.clubName
    : isGuardian
    ? currentAccount?.playerName
    : currentAccount?.fullName;
  const roleLabel = isClub
    ? "Club account"
    : isGuardian
    ? `Parent/Guardian · Managing ${currentAccount?.playerName ?? "player"}`
    : isCoach
    ? "Coach account"
    : "Player account";

  const socialLinks = currentAccount?.socialLinks ?? { instagram: "", facebook: "", x: "", tiktok: "" };

  const updateSocial = (key: keyof SocialLinks, value: string) => {
    updateAccount({ socialLinks: { ...socialLinks, [key]: value } });
  };

  const save = () => {
    if (isClub) {
      updateClubProfile({
        ...clubProfile,
        name: currentAccount?.clubName ?? clubProfile.name,
        sport: currentAccount?.defaultSport ?? clubProfile.sport,
        location: currentAccount?.location ?? clubProfile.location,
        mapAddress: clubMapAddress,
        bio: clubBio,
      });
    } else if (isGuardian) {
      updateAccount({
        playerName: currentAccount?.playerName,
        parentGuardianName: currentAccount?.parentGuardianName,
        bio: guardianBio,
      });
      updatePlayerProfile({
        ...playerProfile,
        name: currentAccount?.playerName ?? playerProfile.name,
        location: currentAccount?.location ?? playerProfile.location,
        sports: (currentAccount?.sports ?? []).join(", "),
        bio: guardianBio,
      });
    } else if (isCoach) {
      updateAccount({ bio: coachBio });
      updatePlayerProfile({
        ...playerProfile,
        name: currentAccount?.fullName ?? playerProfile.name,
        location: currentAccount?.location ?? playerProfile.location,
        sports: (currentAccount?.sports ?? []).join(", "),
        bio: coachBio,
      });
    } else {
      updatePlayerProfile({
        ...playerProfile,
        name: currentAccount?.fullName ?? playerProfile.name,
        location: currentAccount?.location ?? playerProfile.location,
        sports: (currentAccount?.sports ?? []).join(", "),
        bio: playerBio,
      });
    }
    setMode("view");
    Alert.alert("Profile saved", "Your changes are now visible in the app.");
  };

  const openEdit = () => {
    setPlayerBio(playerProfile.bio ?? "");
    setGuardianBio(currentAccount?.role === "guardian" ? currentAccount.bio ?? "" : "");
    setCoachBio(currentAccount?.role === "coach" ? currentAccount.bio ?? "" : "");
    setClubBio(clubProfile.bio ?? "");
    setClubMapAddress(clubProfile.mapAddress ?? "");
    setMode("edit");
  };

  const confirmDob = () => {
    const parts = draftDob.split("-");
    if (parts.length !== 3) return;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return;
    updateAccount({ dateOfBirth: formatDate(new Date(year, month - 1, day)) });
    setShowDobPicker(false);
  };

  const toggleSport = (sportName: string) => {
    const current = currentAccount?.sports ?? [];
    const next = current.includes(sportName)
      ? current.filter((s) => s !== sportName)
      : [...current, sportName];
    const updates: Parameters<typeof updateAccount>[0] = { sports: next };
    if (!next.includes(currentAccount?.defaultSport ?? "")) {
      updates.defaultSport = next[0] ?? "";
    }
    updateAccount(updates);
  };

  const buildInfoRows = () => {
    if (!currentAccount) return [];
    const link = (url: string) => url ? normaliseUrl(url) : undefined;
    if (isClub) {
      return [
        { label: "Club name", value: currentAccount.clubName ?? "" },
        { label: "Sport", value: currentAccount.defaultSport ?? "" },
        { label: "Address", value: currentAccount.clubAddress ?? currentAccount.location ?? "" },
        { label: "Contact email", value: currentAccount.clubContactEmail ?? "", url: currentAccount.clubContactEmail ? `mailto:${currentAccount.clubContactEmail}` : undefined },
        { label: "Contact mobile", value: currentAccount.clubContactMobile ?? "" },
        { label: "Bio", value: clubBio },
        { label: "Website", value: currentAccount.clubWebsite ?? "", url: link(currentAccount.clubWebsite ?? "") },
        { label: "Instagram", value: socialLinks.instagram ?? "", url: link(socialLinks.instagram ?? "") },
        { label: "Facebook", value: socialLinks.facebook ?? "", url: link(socialLinks.facebook ?? "") },
        { label: "X / Twitter", value: socialLinks.x ?? "", url: link(socialLinks.x ?? "") },
        { label: "TikTok", value: socialLinks.tiktok ?? "", url: link(socialLinks.tiktok ?? "") },
      ].filter((row) => row.value);
    }
    const rows: { label: string; value: string; url?: string }[] = [
      { label: isGuardian ? "Player name" : "Full name", value: isGuardian ? currentAccount.playerName ?? "" : currentAccount.fullName ?? "" },
      { label: "Gender", value: currentAccount.gender ?? "" },
      { label: "Date of birth", value: currentAccount.dateOfBirth ? `${currentAccount.dateOfBirth}${age !== null ? ` · Age ${age}` : ""}` : "" },
      { label: "Location", value: currentAccount.location ?? "" },
      { label: "Mobile", value: currentAccount.mobile ?? "" },
      { label: "Bio", value: isGuardian ? guardianBio : playerBio },
      { label: "Sports", value: (currentAccount.sports ?? []).join(", ") },
      { label: "Instagram", value: socialLinks.instagram ?? "", url: link(socialLinks.instagram ?? "") },
      { label: "Facebook", value: socialLinks.facebook ?? "", url: link(socialLinks.facebook ?? "") },
      { label: "X / Twitter", value: socialLinks.x ?? "", url: link(socialLinks.x ?? "") },
      { label: "TikTok", value: socialLinks.tiktok ?? "", url: link(socialLinks.tiktok ?? "") },
    ];
    if (currentAccount.highlightReelUrl) {
      const status = currentAccount.highlightReelStatus;
      rows.push({
        label: "Highlight reel",
        value: `${currentAccount.highlightReelUrl}${status && status !== "approved" ? ` (${status})` : ""}`,
        url: status === "approved" ? link(currentAccount.highlightReelUrl) : undefined,
      });
    }
    return rows.filter((row) => row.value);
  };

  const infoRows = buildInfoRows();

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>My profile</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isClub ? "Club profile" : isGuardian ? "Player profile" : isCoach ? "Coach profile" : "Player profile"}
          </Text>
        </View>

        {currentAccount ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.accountTop}>
              <View style={[styles.accountIcon, { backgroundColor: colors.pitchSoft }]}>
                <Feather name={isClub ? "shield" : isCoach ? "award" : "user"} size={22} color={colors.primary} />
              </View>
              <View style={styles.accountCopy}>
                <Text style={[styles.accountName, { color: colors.foreground }]}>{accountName}</Text>
                <Text style={[styles.accountRole, { color: colors.mutedForeground }]}>{roleLabel}</Text>
                {age !== null && !isClub ? (
                  <Text style={[styles.accountRole, { color: colors.mutedForeground }]}>Age {age} · {currentAccount.defaultSport}</Text>
                ) : currentAccount.defaultSport ? (
                  <Text style={[styles.accountRole, { color: colors.mutedForeground }]}>{currentAccount.defaultSport}</Text>
                ) : null}
              </View>
            </View>
            <PrimaryButton label="Sign out" icon="log-out" onPress={signOut} />
            <PrimaryButton label={mode === "edit" ? "Cancel editing" : "Edit Profile"} icon={mode === "edit" ? "x" : "edit-3"} onPress={mode === "edit" ? () => setMode("view") : openEdit} />
          </View>
        ) : null}

        {mode === "view" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileTop}>
              <ProfileAvatar uri={isClub ? clubImage : playerImage} fallback={fallbackImage} size={72} />
              <View style={styles.profileCopy}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {isClub ? "Club profile" : isCoach ? "Coach profile" : "Player profile"}
                </Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
                  {isClub ? "Club details shown below." : isGuardian ? "Managed by parent or guardian." : "Profile details shown below."}
                </Text>
              </View>
            </View>
            {infoRows.map(({ label, value, url }) => (
              url ? (
                <Pressable key={label} onPress={() => openLink(url)} style={({ pressed }) => [styles.infoRow, { opacity: pressed ? 0.65 : 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <View style={styles.linkRow}>
                    {SOCIAL_ICONS[label] ? <Feather name={SOCIAL_ICONS[label]} size={14} color={colors.primary} /> : null}
                    <Text style={[styles.infoValue, { color: colors.primary, flex: 1 }]} numberOfLines={1}>{value}</Text>
                    <Feather name="external-link" size={13} color={colors.primary} />
                  </View>
                </Pressable>
              ) : (
                <View key={label} style={styles.infoRow}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              )
            ))}
            {isClub ? (
              <View style={styles.mapRow}>
                <Pressable onPress={() => openMapApp("apple", clubMapQuery)} style={({ pressed }) => [styles.mapBtn, { backgroundColor: colors.navy, opacity: pressed ? 0.75 : 1 }]}>
                  <Feather name="map" color="#FFF" size={16} />
                  <Text style={styles.mapBtnText}>Apple Maps</Text>
                </Pressable>
                <Pressable onPress={() => openMapApp("google", clubMapQuery)} style={({ pressed }) => [styles.mapBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
                  <Feather name="navigation" color="#FFF" size={16} />
                  <Text style={styles.mapBtnText}>Google Maps</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : isClub ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileTop}>
              <ProfileAvatar uri={clubImage} fallback={fallbackImage} size={72} />
              <View style={styles.profileCopy}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Edit club profile</Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Changes save back to your account profile.</Text>
              </View>
            </View>

            <Field label="Club name" value={currentAccount?.clubName ?? ""} onChangeText={(v) => updateAccount({ clubName: v })} />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Club sport (required)</Text>
            <View style={styles.wrapRow}>
              {approvedSports.map((sport) => (
                <Choice key={sport.name} label={sport.name} active={currentAccount?.defaultSport === sport.name} onPress={() => updateAccount({ defaultSport: sport.name, sports: [sport.name] })} />
              ))}
            </View>

            <Field label="Suburb" value={suburb} onChangeText={setSuburb} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>State</Text>
            <View style={styles.wrapRow}>
              {states.map((item) => (
                <Choice key={item} label={item} active={state === item} onPress={() => setState(item)} />
              ))}
            </View>
            <Field label="Club ground or street address" value={clubMapAddress} onChangeText={setClubMapAddress} placeholder="e.g. Princes Park, Carlton North VIC" />
            <Field label="Club contact email" value={currentAccount?.clubContactEmail ?? ""} onChangeText={(v) => updateAccount({ clubContactEmail: v })} keyboardType="email-address" />
            <Field label="Club contact mobile" value={currentAccount?.clubContactMobile ?? ""} onChangeText={(v) => updateAccount({ clubContactMobile: v })} keyboardType="phone-pad" />
            <Field label="Club bio" value={clubBio} onChangeText={(value) => setClubBio(value.slice(0, 250))} multiline maxLength={250} />
            <Field label="Club website" value={currentAccount?.clubWebsite ?? ""} onChangeText={(v) => updateAccount({ clubWebsite: v })} />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Social links (optional)</Text>
            <Field label="Instagram link" value={socialLinks.instagram ?? ""} onChangeText={(v) => updateSocial("instagram", v)} />
            <Field label="Facebook link" value={socialLinks.facebook ?? ""} onChangeText={(v) => updateSocial("facebook", v)} />
            <Field label="X / Twitter link" value={socialLinks.x ?? ""} onChangeText={(v) => updateSocial("x", v)} />
            <Field label="TikTok link" value={socialLinks.tiktok ?? ""} onChangeText={(v) => updateSocial("tiktok", v)} />

            <View style={styles.mapRow}>
              <Pressable onPress={() => openMapApp("apple", clubMapQuery)} style={({ pressed }) => [styles.mapBtn, { backgroundColor: colors.navy, opacity: pressed ? 0.75 : 1 }]}>
                <Feather name="map" color="#FFF" size={16} />
                <Text style={styles.mapBtnText}>Apple Maps</Text>
              </Pressable>
              <Pressable onPress={() => openMapApp("google", clubMapQuery)} style={({ pressed }) => [styles.mapBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
                <Feather name="navigation" color="#FFF" size={16} />
                <Text style={styles.mapBtnText}>Google Maps</Text>
              </Pressable>
            </View>
            <PrimaryButton label="Submit club image" icon="shield" onPress={() => pickProfileImage("club")} />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileTop}>
              <ProfileAvatar uri={playerImage} fallback={fallbackImage} size={72} />
              <View style={styles.profileCopy}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {isCoach ? "Edit coach profile" : isGuardian ? "Edit player profile" : "Edit player profile"}
                </Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
                  {isGuardian ? "Managed by parent or guardian." : "Changes save back to your account profile."}
                </Text>
              </View>
            </View>

            {isGuardian ? (
              <>
                <Field label="Parent/Guardian full name" value={currentAccount?.parentGuardianName ?? ""} onChangeText={(v) => updateAccount({ parentGuardianName: v })} />
                <Field label="Player's full name" value={currentAccount?.playerName ?? ""} onChangeText={(v) => updateAccount({ playerName: v })} />
              </>
            ) : (
              <Field label="Full name" value={currentAccount?.fullName ?? ""} onChangeText={(v) => updateAccount({ fullName: v })} />
            )}

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {isGuardian ? "Player gender (required)" : "Gender (required)"}
            </Text>
            <View style={styles.wrapRow}>
              {genders.map((gender) => (
                <Choice key={gender} label={gender} active={currentAccount?.gender === gender} onPress={() => updateAccount({ gender })} />
              ))}
            </View>

            <Pressable
              onPress={() => { setDraftDob(currentAccount?.dateOfBirth ?? ""); setShowDobPicker(true); }}
              style={({ pressed }) => [styles.dobButton, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
            >
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {isGuardian ? "Player date of birth (required)" : "Date of birth (required)"}
              </Text>
              <Text style={[styles.dobValue, { color: currentAccount?.dateOfBirth ? colors.foreground : colors.mutedForeground }]}>
                {currentAccount?.dateOfBirth
                  ? `${currentAccount.dateOfBirth}${age !== null ? ` · Age ${age}` : ""}`
                  : "Tap to choose a date"}
              </Text>
            </Pressable>

            <Modal transparent visible={showDobPicker} animationType="fade" onRequestClose={() => setShowDobPicker(false)}>
              <View style={styles.modalScrim}>
                <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose date of birth</Text>
                  <TextInput
                    value={draftDob}
                    onChangeText={(value) => setDraftDob(formatDobInput(value))}
                    placeholder="DD-MM-YYYY"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  />
                  <View style={styles.modalActions}>
                    <Pressable onPress={() => setShowDobPicker(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
                      <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={confirmDob} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                      <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Set date</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            <Field label="Suburb" value={suburb} onChangeText={setSuburb} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>State</Text>
            <View style={styles.wrapRow}>
              {states.map((item) => (
                <Choice key={item} label={item} active={state === item} onPress={() => setState(item)} />
              ))}
            </View>
            <Field
              label={isGuardian ? "Parent/Guardian email address" : "Email address"}
              value={currentAccount?.email ?? ""}
              onChangeText={(v) => updateAccount({ email: v })}
              keyboardType="email-address"
            />
            <Field
              label={isGuardian ? "Parent/Guardian mobile number" : "Mobile number"}
              value={currentAccount?.mobile ?? ""}
              onChangeText={(v) => updateAccount({ mobile: v })}
              keyboardType="phone-pad"
            />
            <Field
              label={isGuardian ? "Player bio" : isCoach ? "Coach bio" : "Bio"}
              value={isClub ? clubBio : isCoach ? coachBio : isGuardian ? guardianBio : playerBio}
              onChangeText={(value) => {
                const next = value.slice(0, 250);
                if (isClub) setClubBio(next);
                else if (isCoach) setCoachBio(next);
                else if (isGuardian) setGuardianBio(next);
                else setPlayerBio(next);
              }}
              multiline
              maxLength={250}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {isGuardian ? "Player sports played (required)" : isCoach ? "Sports coached (required)" : "Sports played (required)"}
            </Text>
            <View style={styles.wrapRow}>
              {approvedSports.map((sport) => (
                <Choice
                  key={sport.name}
                  label={sport.name}
                  active={(currentAccount?.sports ?? []).includes(sport.name)}
                  onPress={() => toggleSport(sport.name)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Default sport (required)</Text>
            <View style={styles.wrapRow}>
              {(currentAccount?.sports ?? []).length > 0
                ? (currentAccount?.sports ?? []).map((sportName) => (
                    <Choice
                      key={sportName}
                      label={sportName}
                      active={currentAccount?.defaultSport === sportName}
                      onPress={() => updateAccount({ defaultSport: sportName })}
                    />
                  ))
                : <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Select at least one sport above first.</Text>
              }
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Social links (optional)</Text>
            <Field label="Instagram link" value={socialLinks.instagram ?? ""} onChangeText={(v) => updateSocial("instagram", v)} />
            <Field label="Facebook link" value={socialLinks.facebook ?? ""} onChangeText={(v) => updateSocial("facebook", v)} />
            <Field label="X / Twitter link" value={socialLinks.x ?? ""} onChangeText={(v) => updateSocial("x", v)} />
            <Field label="TikTok link" value={socialLinks.tiktok ?? ""} onChangeText={(v) => updateSocial("tiktok", v)} />
            <Field label="Highlights reel link (admin approved)" value={currentAccount?.highlightReelUrl ?? ""} onChangeText={(v) => updateAccount({ highlightReelUrl: v, highlightReelStatus: v ? "pending" : undefined })} />

            <PrimaryButton
              label={isCoach ? "Submit coach image" : "Submit player image"}
              icon="image"
              onPress={() => pickProfileImage("player")}
            />
          </View>
        )}

        {mode === "edit" ? <PrimaryButton label="Save profile" icon="check" onPress={save} /> : null}

        {isAdmin ? (
          <>
            <SectionTitle title="Admin image moderation" action={`${pendingImages.length} pending`} />
            <View style={[styles.adminCard, { backgroundColor: colors.navy, borderColor: colors.navy }]}>
              <View style={styles.adminHeader}>
                <View style={[styles.adminIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="lock" size={18} color={colors.accentForeground} />
                </View>
                <View style={styles.profileCopy}>
                  <Text style={[styles.adminTitle, { color: "#FFF" }]}>Admin permissions</Text>
                  <Text style={[styles.adminText, { color: "#B9CBC4" }]}>Only approved profile images become public. Pending uploads appear here for review.</Text>
                </View>
              </View>
              {pendingImages.length === 0 ? (
                <Text style={[styles.adminText, { color: "#B9CBC4" }]}>No images need review right now.</Text>
              ) : pendingImages.map((img) => (
                <View key={img.id} style={[styles.reviewRow, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <ProfileAvatar uri={img.uri} fallback={fallbackImage} size={54} />
                  <View style={styles.reviewCopy}>
                    <Text style={[styles.reviewTitle, { color: "#FFF" }]}>{img.owner} image</Text>
                    <Text style={[styles.adminText, { color: "#B9CBC4" }]}>Pending review</Text>
                  </View>
                  <Pressable onPress={() => moderateImage(img.id, "approved")} style={[styles.reviewBtn, { backgroundColor: colors.primary }]}>
                    <Feather name="check" color="#FFF" size={18} />
                  </Pressable>
                  <Pressable onPress={() => moderateImage(img.id, "rejected")} style={[styles.reviewBtn, { backgroundColor: colors.destructive }]}>
                    <Feather name="x" color="#FFF" size={18} />
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
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Approved sports are added to the filter list and can be used in adverts.</Text>
                </View>
              </View>
              {pendingSports.length === 0 ? (
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>No sport requests need review right now.</Text>
              ) : pendingSports.map((req) => (
                <View key={req.id} style={[styles.reviewRow, { backgroundColor: colors.secondary }]}>
                  <View style={styles.reviewCopy}>
                    <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{req.name}</Text>
                    <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Pending admin approval</Text>
                  </View>
                  <Pressable onPress={() => moderateSportRequest(req.id, "approved")} style={[styles.reviewBtn, { backgroundColor: colors.primary }]}>
                    <Feather name="check" color="#FFF" size={18} />
                  </Pressable>
                  <Pressable onPress={() => moderateSportRequest(req.id, "rejected")} style={[styles.reviewBtn, { backgroundColor: colors.destructive }]}>
                    <Feather name="x" color="#FFF" size={18} />
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
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Highlight reels stay pending until an admin approves them.</Text>
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
                  <Pressable onPress={() => moderateHighlightLink(link.id, "approved")} style={[styles.reviewBtn, { backgroundColor: colors.primary }]}>
                    <Feather name="check" color="#FFF" size={18} />
                  </Pressable>
                  <Pressable onPress={() => moderateHighlightLink(link.id, "rejected")} style={[styles.reviewBtn, { backgroundColor: colors.destructive }]}>
                    <Feather name="x" color="#FFF" size={18} />
                  </Pressable>
                </View>
              ))}
            </View>

            <SectionTitle title="Admin account" action="" />
            <View style={[styles.adminCard, { backgroundColor: colors.navy, borderColor: colors.navy }]}>
              <View style={styles.adminHeader}>
                <View style={[styles.adminIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="settings" size={18} color={colors.accentForeground} />
                </View>
                <View style={styles.profileCopy}>
                  <Text style={[styles.adminTitle, { color: "#FFF" }]}>Admin settings</Text>
                  <Text style={[styles.adminText, { color: "#B9CBC4" }]}>Manage your admin passcode or sign out of admin mode.</Text>
                </View>
              </View>
              {showChangePasscode ? (
                <>
                  <TextInput
                    value={currentPasscodeInput}
                    onChangeText={setCurrentPasscodeInput}
                    placeholder="Current passcode"
                    placeholderTextColor="#B9CBC4"
                    secureTextEntry
                    style={[styles.adminInput, { borderColor: "rgba(255,255,255,0.2)", color: "#FFF", backgroundColor: "rgba(255,255,255,0.08)" }]}
                  />
                  <TextInput
                    value={newPasscodeInput}
                    onChangeText={setNewPasscodeInput}
                    placeholder="New passcode"
                    placeholderTextColor="#B9CBC4"
                    secureTextEntry
                    style={[styles.adminInput, { borderColor: "rgba(255,255,255,0.2)", color: "#FFF", backgroundColor: "rgba(255,255,255,0.08)" }]}
                  />
                  <View style={styles.adminActions}>
                    <Pressable
                      onPress={() => { setShowChangePasscode(false); setCurrentPasscodeInput(""); setNewPasscodeInput(""); }}
                      style={({ pressed }) => [styles.adminActionBtn, { backgroundColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={[styles.adminActionText, { color: "#FFF" }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const ok = changeAdminPasscode(currentPasscodeInput, newPasscodeInput);
                        if (ok) {
                          setShowChangePasscode(false);
                          setCurrentPasscodeInput("");
                          setNewPasscodeInput("");
                          Alert.alert("Passcode updated", "Your new admin passcode has been saved.");
                        } else {
                          Alert.alert("Incorrect passcode", "The current passcode you entered is incorrect.");
                        }
                      }}
                      style={({ pressed }) => [styles.adminActionBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={[styles.adminActionText, { color: "#FFF" }]}>Save new passcode</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  onPress={() => { setCurrentPasscodeInput(""); setNewPasscodeInput(""); setShowChangePasscode(true); }}
                  style={({ pressed }) => [styles.adminActionBtn, { backgroundColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.8 : 1 }]}
                >
                  <Feather name="key" color="#FFF" size={15} />
                  <Text style={[styles.adminActionText, { color: "#FFF" }]}>Change passcode</Text>
                </Pressable>
              )}
              <Pressable onPress={adminSignOut} style={({ pressed }) => [styles.adminActionBtn, { backgroundColor: colors.destructive, opacity: pressed ? 0.8 : 1 }]}>
                <Feather name="log-out" color="#FFF" size={15} />
                <Text style={[styles.adminActionText, { color: "#FFF" }]}>Sign out of admin</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "800", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 14 },
  accountTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  accountIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  accountCopy: { flex: 1 },
  accountName: { fontWeight: "800", fontSize: 19 },
  accountRole: { fontWeight: "500", fontSize: 13, lineHeight: 20, marginTop: 2 },
  profileTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  profileCopy: { flex: 1 },
  cardTitle: { fontWeight: "700", fontSize: 17 },
  cardText: { fontWeight: "500", fontSize: 13, lineHeight: 19, marginTop: 2 },
  label: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow: { gap: 3 },
  infoValue: { fontWeight: "600", fontSize: 15, lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  choiceText: { fontWeight: "700", fontSize: 13 },
  mapRow: { flexDirection: "row", gap: 10 },
  mapBtn: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  mapBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  dobButton: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  dobValue: { fontWeight: "600", fontSize: 15 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 22, gap: 14 },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 46, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
  smallPrint: { fontWeight: "500", fontSize: 12, lineHeight: 17 },
  adminCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 14 },
  adminHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  adminIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  adminTitle: { fontWeight: "700", fontSize: 17 },
  adminText: { fontWeight: "500", fontSize: 13, lineHeight: 19 },
  reviewRow: { borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  reviewCopy: { flex: 1 },
  reviewTitle: { fontWeight: "700", fontSize: 15 },
  reviewBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  adminInput: { borderWidth: 1, borderRadius: 14, minHeight: 46, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  adminActions: { flexDirection: "row", gap: 10 },
  adminActionBtn: { flex: 1, flexDirection: "row", gap: 8, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  adminActionText: { fontWeight: "700", fontSize: 14 },
});
