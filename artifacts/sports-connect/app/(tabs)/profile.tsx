import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, PrimaryButton, ProfileAvatar, SectionTitle } from "@/components/SportsUI";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";
import { openMapApp } from "@/utils/mapLinks";

type Mode = "view" | "edit";

const fallbackImage = require("@/assets/images/player-placeholder.png");

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
  const [player, setPlayer] = useState(playerProfile);
  const [club, setClub] = useState(clubProfile);

  useEffect(() => {
    setPlayer(playerProfile);
    setClub(clubProfile);
  }, [playerProfile, clubProfile]);

  const pendingImages = profileImages.filter((img) => img.status === "pending");
  const pendingSports = pendingSportRequests.filter((r) => r.status === "pending");
  const pendingHighlights = pendingHighlightLinks.filter((l) => l.status === "pending");
  const playerImage = getImageUri(playerProfile.imageId, true);
  const clubImage = getImageUri(clubProfile.imageId, true);
  const clubMapQuery = `${club.name} ${club.mapAddress || club.location}`;

  const role = currentAccount?.role ?? "player";
  const isClub = role === "club";
  const isGuardian = role === "guardian";
  const isCoach = role === "coach";
  const age = parseDobAge(currentAccount?.dateOfBirth);
  const accountName = isClub ? currentAccount?.clubName : isGuardian ? currentAccount?.playerName : currentAccount?.fullName;
  const roleLabel = isClub ? "Club account" : isGuardian ? `Parent/Guardian · Managing ${currentAccount?.playerName ?? "player"}` : isCoach ? "Coach account" : "Player account";

  const save = () => {
    if (isClub) {
      updateAccount({
        clubName: club.name,
        clubAddress: club.mapAddress,
        clubWebsite: "",
        location: club.location,
        defaultSport: club.sport,
      });
      updateClubProfile(club);
    } else {
      updateAccount({
        fullName: player.name,
        playerName: player.name,
        location: player.location,
        sports: player.sports.split(",").map((item) => item.trim()).filter(Boolean),
      });
      updatePlayerProfile(player);
    }
    setMode("view");
    Alert.alert("Profile saved", "Your changes are now visible in the app.");
  };

  const openEdit = () => {
    if (isClub) {
      setClub(clubProfile);
    } else {
      setPlayer(playerProfile);
    }
    setMode("edit");
  };

  const setDob = (date: Date) => {
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const year = date.getFullYear();
    const next = `${day}-${month}-${year}`;
    updateAccount({ dateOfBirth: next });
    setMode("edit");
    setShowDobPicker(false);
  };

  const infoRows = useMemo(() => {
    if (!currentAccount) return [];
    if (isClub) {
      return [
        ["Club name", currentAccount.clubName ?? ""],
        ["Address", currentAccount.clubAddress ?? currentAccount.location ?? ""],
        ["Contact email", currentAccount.clubContactEmail ?? ""],
        ["Contact mobile", currentAccount.clubContactMobile ?? ""],
        ["Website", currentAccount.clubWebsite ?? ""],
      ].filter(([, value]) => value);
    }
    return [
      [isGuardian ? "Player name" : "Full name", isGuardian ? currentAccount.playerName ?? "" : currentAccount.fullName ?? ""],
      ["Gender", currentAccount.gender ?? ""],
      ["Date of birth", currentAccount.dateOfBirth ?? ""],
      ["Location", currentAccount.location ?? ""],
      ["Mobile", currentAccount.mobile ?? ""],
      ["Sports", currentAccount.sports.join(", ")],
    ].filter(([, value]) => value);
  }, [currentAccount, isClub, isGuardian]);

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 }]} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>My profile</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{isClub ? "Club profile" : isGuardian ? "Player profile" : isCoach ? "Coach profile" : "Player profile"}</Text>
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
                {age !== null && !isClub ? <Text style={[styles.accountRole, { color: colors.mutedForeground }]}>Age {age} · {currentAccount.defaultSport}</Text> : currentAccount.defaultSport ? <Text style={[styles.accountRole, { color: colors.mutedForeground }]}>{currentAccount.defaultSport}</Text> : null}
              </View>
            </View>
            <PrimaryButton label="Sign out" icon="log-out" onPress={signOut} />
            <PrimaryButton label="Edit Profile" icon="edit-3" onPress={openEdit} />
          </View>
        ) : null}

        {mode === "view" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.profileTop}>
              <ProfileAvatar uri={isClub ? clubImage : playerImage} fallback={fallbackImage} size={72} />
              <View style={styles.profileCopy}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{isClub ? "Club profile" : isCoach ? "Coach profile" : "Player profile"}</Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{isClub ? "Club details shown below." : isGuardian ? "Managed by parent or guardian." : "Profile details shown below."}</Text>
              </View>
            </View>
            {infoRows.map(([label, value]) => (
              <View key={label} style={styles.infoRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
              </View>
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
            <Field label="Club name" value={club.name} onChangeText={(v) => setClub((c) => ({ ...c, name: v }))} />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Club sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportRow}>
              {approvedSports.map((sport) => (
                <Pressable key={sport.name} onPress={() => setClub((c) => ({ ...c, sport: sport.name }))} style={({ pressed }) => [styles.sportPill, { backgroundColor: club.sport === sport.name ? sport.button : sport.soft, opacity: pressed ? 0.75 : 1 }]}>
                  <Text style={[styles.sportPillText, { color: club.sport === sport.name ? "#FFF" : sport.text }]}>{sport.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Field label="Suburb, city and state" value={club.location} onChangeText={(v) => setClub((c) => ({ ...c, location: v }))} />
            <Field label="Club ground or street address" value={club.mapAddress ?? ""} onChangeText={(v) => setClub((c) => ({ ...c, mapAddress: v }))} placeholder="e.g. Princes Park, Carlton North VIC" />
            <Field label="Club bio" value={club.bio} onChangeText={(v) => setClub((c) => ({ ...c, bio: v }))} multiline />
            <Field label="Club contact email" value={currentAccount?.clubContactEmail ?? ""} onChangeText={(v) => updateAccount({ clubContactEmail: v })} keyboardType="email-address" />
            <Field label="Club contact mobile" value={currentAccount?.clubContactMobile ?? ""} onChangeText={(v) => updateAccount({ clubContactMobile: v })} keyboardType="phone-pad" />
            <Field label="Club website" value={currentAccount?.clubWebsite ?? ""} onChangeText={(v) => updateAccount({ clubWebsite: v })} />
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
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{isCoach ? "Edit coach profile" : "Edit player profile"}</Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{isGuardian ? "Managed by parent or guardian." : "Changes save back to your account profile."}</Text>
              </View>
            </View>
            <Field label={isGuardian ? "Player name" : "Full name"} value={player.name} onChangeText={(v) => setPlayer((p) => ({ ...p, name: v }))} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{role === "guardian" ? "Player gender (required)" : "Gender (required)"}</Text>
            <View style={styles.wrapRow}>
              {["Male", "Female", "Pref Not to Say"].map((gender) => (
                <Choice key={gender} label={gender} active={currentAccount?.gender === gender} onPress={() => updateAccount({ gender })} />
              ))}
            </View>
            <Pressable onPress={() => { setDraftDob(currentAccount?.dateOfBirth ?? ""); setShowDobPicker(true); }} style={({ pressed }) => [styles.dobButton, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{`${role === "guardian" ? "Player " : ""}Date of Birth (required)`}</Text>
              <Text style={[styles.dobValue, { color: currentAccount?.dateOfBirth ? colors.foreground : colors.mutedForeground }]}>{currentAccount?.dateOfBirth ? `${currentAccount.dateOfBirth}${age ? ` · Age ${age}` : ""}` : "Tap to choose a date"}</Text>
            </Pressable>
            <Modal transparent visible={showDobPicker} animationType="fade" onRequestClose={() => setShowDobPicker(false)}>
              <View style={styles.modalScrim}>
                <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose date of birth</Text>
                  <View style={styles.dateRow}>
                    <TextInput value={draftDob} onChangeText={setDraftDob} placeholder="DD-MM-YYYY" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
                  </View>
                  <View style={styles.modalActions}>
                    <Pressable onPress={() => setShowDobPicker(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
                      <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={() => { const parts = draftDob.split("-"); if (parts.length !== 3) return; const [day, month, year] = parts.map(Number); if (!day || !month || !year) return; setDob(new Date(year, month - 1, day)); }} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                      <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Set date</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
            <Field label="Suburb/City & State (Australia only) (required)" value={currentAccount?.location ?? ""} onChangeText={(v) => updateAccount({ location: v })} />
            <Field label={role === "guardian" ? "Parent/Guardian Email Address (required)" : "Email Address (required)"} value={currentAccount?.email ?? ""} onChangeText={(v) => updateAccount({ email: v })} keyboardType="email-address" />
            <Field label={role === "guardian" ? "Parent/Guardian Mobile Number (required)" : "Mobile Number (required)"} value={currentAccount?.mobile ?? ""} onChangeText={(v) => updateAccount({ mobile: v })} keyboardType="phone-pad" />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{role === "guardian" ? "Player sports played (required)" : role === "coach" ? "Sports coached (required)" : "Sports played (required)"}</Text>
            <View style={styles.wrapRow}>
              {approvedSports.map((sport) => (
                <Choice key={sport.name} label={sport.name} active={(currentAccount?.sports ?? []).includes(sport.name)} onPress={() => {
                  const next = currentAccount?.sports ?? [];
                  updateAccount({ sports: next.includes(sport.name) ? next.filter((item) => item !== sport.name) : [...next, sport.name] });
                }} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Default Sport (required)</Text>
            <View style={styles.wrapRow}>
              {approvedSports.map((sport) => (
                <Choice key={sport.name} label={sport.name} active={currentAccount?.defaultSport === sport.name} onPress={() => updateAccount({ defaultSport: sport.name })} />
              ))}
            </View>
            <Field label="Location" value={player.location} onChangeText={(v) => setPlayer((p) => ({ ...p, location: v }))} />
            <Field label={isCoach ? "Coaching bio" : "Player bio"} value={player.bio} onChangeText={(v) => setPlayer((p) => ({ ...p, bio: v }))} multiline />
            <PrimaryButton label={isCoach ? "Submit coach image" : "Submit player image"} icon="image" onPress={() => pickProfileImage("player")} />
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
                    <Pressable onPress={() => { setShowChangePasscode(false); setCurrentPasscodeInput(""); setNewPasscodeInput(""); }} style={({ pressed }) => [styles.adminActionBtn, { backgroundColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.8 : 1 }]}>
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
                <Pressable onPress={() => { setCurrentPasscodeInput(""); setNewPasscodeInput(""); setShowChangePasscode(true); }} style={({ pressed }) => [styles.adminActionBtn, { backgroundColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.8 : 1 }]}>
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
  fieldLabel: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow: { gap: 3 },
  infoValue: { fontWeight: "600", fontSize: 15, lineHeight: 20 },
  sportRow: { gap: 8, paddingBottom: 8, paddingRight: 20 },
  sportPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  sportPillText: { fontWeight: "800", fontSize: 13 },
  mapRow: { flexDirection: "row", gap: 10 },
  mapBtn: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  mapBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
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