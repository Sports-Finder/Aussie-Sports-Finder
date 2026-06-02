import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/SportsUI";
import { AccountRole, AuthMethod, SocialLinks, useSportsConnect } from "@/context/SportsConnectContext";
import { getDefaultAvatar } from "@/constants/defaultAvatars";
import { useColors } from "@/hooks/useColors";

const logo = require("@/assets/images/icon.png") as number;
const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const genders = ["Male", "Female", "Pref Not to Say"];

type SetupStep = "type" | "details";

const roleCopy: Record<AccountRole, { title: string; subtitle: string }> = {
  player: { title: "I am a Player (18+ only) looking for a Club.", subtitle: "Create a player profile for clubs to review after connection." },
  guardian: { title: "I am a Parent/Guardian of an underage Player (17 years and under) looking for a Club.", subtitle: "Create a player profile managed on behalf of a parent or guardian." },
  coach: { title: "I am a Coach looking for a Club.", subtitle: "Create a coach profile for clubs to review after connection." },
  club: { title: "I am a Club looking for Players or Coaches.", subtitle: "Create a club profile, address and contact details." },
};

function parseDob(dateOfBirth: string) {
  const digits = dateOfBirth.replace(/\D/g, "");
  if (digits.length !== 8) return new Date("");
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (!day || !month || !year) return new Date("");
  return new Date(year, month - 1, day);
}

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("-");
}

function formatDob(date: Date) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function calculateAge(dateOfBirth: string) {
  const dob = parseDob(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? `${age}` : "";
}

function isAustralianLocation(value: string) {
  const upper = value.toUpperCase();
  return states.some((state) => upper.includes(state)) || value.trim().length > 3;
}

function isValidSocialLink(platform: keyof SocialLinks, value: string) {
  if (!value.trim()) return true;
  const allowed: Record<keyof SocialLinks, string[]> = {
    instagram: ["instagram.com"],
    facebook: ["facebook.com", "fb.com"],
    x: ["x.com", "twitter.com"],
    tiktok: ["tiktok.com"],
  };
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return allowed[platform].some((domain) => url.hostname.replace(/^www\./, "").endsWith(domain));
  } catch {
    return false;
  }
}

export function AccountSetupGate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();

  const { bannedEmails, createAccount, approvedSports, pickAccountImage } = useSportsConnect();

  // Derive identity from Clerk
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const authMethod: AuthMethod = user?.externalAccounts?.some((a) => a.provider === "google")
    ? "google"
    : user?.externalAccounts?.some((a) => a.provider === "apple")
    ? "apple"
    : "email";
  const socialId = authMethod !== "email" ? (user?.id ?? "") : undefined;

  // Check banned email on mount (catches OAuth users who just authenticated)
  useEffect(() => {
    if (!email) return;
    if (bannedEmails.map((e) => e.toLowerCase()).includes(email.toLowerCase())) {
      Alert.alert(
        "Account blocked",
        "This email address has been banned by an administrator and cannot be used with this app.",
        [{ text: "OK", onPress: () => { void signOut(); } }],
      );
    }
  }, [email, bannedEmails, signOut]);

  const [step, setStep] = useState<SetupStep>("type");
  const [role, setRole] = useState<AccountRole>("player");
  const [profileImageId, setProfileImageId] = useState<string | undefined>();
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [draftDob, setDraftDob] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    parentGuardianName: "",
    playerName: "",
    clubName: "",
    gender: "",
    dateOfBirth: "",
    suburb: "",
    state: "",
    mobile: "",
    bio: "",
    clubAddress: "",
    clubSuburb: "",
    clubPostcode: "",
    clubWebsite: "",
    clubContactEmail: "",
    clubContactMobile: "",
    instagram: "",
    facebook: "",
    x: "",
    tiktok: "",
    highlightReelUrl: "",
    agreed: false,
  });
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [defaultSport, setDefaultSport] = useState("");

  const isClub = role === "club";
  const age = calculateAge(form.dateOfBirth);

  const socialLinksValid = useMemo(() => (
    isValidSocialLink("instagram", form.instagram) &&
    isValidSocialLink("facebook", form.facebook) &&
    isValidSocialLink("x", form.x) &&
    isValidSocialLink("tiktok", form.tiktok)
  ), [form.instagram, form.facebook, form.x, form.tiktok]);

  const requiredDetailsValid = useMemo(() => {
    if (isClub) {
      return Boolean(
        form.clubName.trim() &&
        defaultSport &&
        form.clubAddress.trim() &&
        form.clubSuburb.trim() &&
        /^\d{4}$/.test(form.clubPostcode) &&
        form.state &&
        form.clubContactEmail.includes("@") &&
        form.clubContactMobile.trim()
      );
    }
    const nameValid = role === "guardian"
      ? Boolean(form.parentGuardianName.trim() && form.playerName.trim())
      : Boolean(form.fullName.trim());
    const guardianAgeValid = role === "guardian" ? Boolean(age && Number(age) <= 17) : true;
    const playerAgeValid = role === "player" ? Boolean(age && Number(age) >= 18) : true;
    return Boolean(
      nameValid && form.gender && form.dateOfBirth &&
      guardianAgeValid && playerAgeValid &&
      form.mobile.trim() && selectedSports.length && defaultSport && form.agreed
    );
  }, [age, defaultSport, form, isClub, role, selectedSports.length]);

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const selectRole = (selected: AccountRole) => {
    setRole(selected);
    if (selected === "club") {
      setForm((current) => ({
        ...current,
        clubContactEmail: current.clubContactEmail || email.toLowerCase(),
      }));
    }
    setStep("details");
  };

  const toggleSport = (sport: string) => {
    setSelectedSports((current) => {
      const next = current.includes(sport)
        ? current.filter((item) => item !== sport)
        : [...current, sport];
      if (!next.includes(defaultSport)) setDefaultSport(next[0] ?? "");
      return next;
    });
  };

  const setDob = (date: Date) => {
    update("dateOfBirth", formatDob(date));
    setShowDobPicker(false);
  };

  const pickImage = async () => {
    const owner = isClub
      ? form.clubName || "Club account"
      : role === "guardian"
      ? form.playerName || "Guardian player account"
      : form.fullName || `${role} account`;
    const imageId = await pickAccountImage(owner);
    if (imageId) setProfileImageId(imageId);
  };

  const submit = () => {
    if (!socialLinksValid) {
      Alert.alert("Social link error", "Only Instagram, Facebook, X/Twitter and TikTok profile links are accepted.");
      return;
    }
    if (!requiredDetailsValid) {
      Alert.alert("Missing details", "Complete all required fields, Australian state details, sport selections and the agreement checkbox.");
      return;
    }
    const created = createAccount({
      role,
      authMethod,
      email: email.toLowerCase(),
      fullName: form.fullName,
      parentGuardianName: form.parentGuardianName,
      playerName: form.playerName,
      clubName: form.clubName,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      location: isClub ? `${form.clubSuburb} ${form.state}`.trim() : `${form.suburb} ${form.state}`.trim(),
      mobile: isClub ? form.clubContactMobile : form.mobile,
      sports: isClub ? [defaultSport] : selectedSports,
      defaultSport,
      profileImageId,
      socialLinks: {
        instagram: form.instagram,
        facebook: form.facebook,
        x: form.x,
        tiktok: form.tiktok,
      },
      highlightReelUrl: form.highlightReelUrl,
      highlightReelStatus: form.highlightReelUrl ? "pending" : undefined,
      clubWebsite: form.clubWebsite,
      clubAddress: form.clubAddress,
      clubSuburb: form.clubSuburb,
      clubPostcode: form.clubPostcode,
      clubContactEmail: form.clubContactEmail,
      clubContactMobile: form.clubContactMobile,
      bio: form.bio || undefined,
      socialId,
    });
    if (!created) return;

    const roleLabel =
      role === "guardian"
        ? "parent/guardian"
        : role === "coach"
          ? "coach"
          : "player";

    if (role === "club") {
      Alert.alert("Account created", "Your club account has been submitted and is awaiting approval.");
    } else {
      Alert.alert(
        "Account created",
        `By creating this ${roleLabel} account, you agree to use this application and your account only for its intended and lawful purpose and agree to our Terms & Conditions. Any misuse, unauthorized activity, or violation of our terms may result in immediate suspension or permanent banning of your account and associated email address.`,
        [{ text: "OK" }],
      );
    }
  };

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 34 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>Aussie Sports Club Finder</Text>
          <Text style={[styles.brandText, { color: colors.mutedForeground }]}>
            Welcome! Choose your account type and complete your profile to get started.
          </Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Sign out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign out", style: "destructive", onPress: () => { void signOut(); } },
                ],
              );
            }}
            style={({ pressed }) => [styles.signOutLink, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="log-out" size={13} color={colors.mutedForeground} />
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Sign out</Text>
          </Pressable>
        </View>

        {/* ── Role selection step ── */}
        {step === "type" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Create an account</Text>
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
              Signed in as {email}
            </Text>
            {(Object.keys(roleCopy) as AccountRole[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => selectRole(item)}
                style={({ pressed }) => [
                  styles.roleCard,
                  { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={[styles.roleTitle, { color: colors.secondaryForeground }]}>
                  {roleCopy[item].title}
                </Text>
                <Text style={[styles.roleText, { color: colors.mutedForeground }]}>
                  {roleCopy[item].subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Profile details step ── */}
        {step === "details" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setStep("type")}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to account type</Text>
            </Pressable>

            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {isClub
                ? "Club account setup"
                : role === "guardian"
                ? "Parent/Guardian player setup"
                : role === "coach"
                ? "Coach account setup"
                : "Player account setup"}
            </Text>

            {isClub ? (
              <>
                <Input label="Club Name (required)" value={form.clubName} onChangeText={(v) => update("clubName", v)} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Sport (required)</Text>
                <SportPicker
                  selectedSports={defaultSport ? [defaultSport] : []}
                  onToggle={(sport) => setDefaultSport(sport)}
                  single
                  approvedSports={approvedSports.map((s) => s.name)}
                />
                <Input
                  label="Club Street Number & Street Address (required)"
                  value={form.clubAddress}
                  onChangeText={(v) => update("clubAddress", v)}
                />
                <Input
                  label="Suburb (required)"
                  value={form.clubSuburb}
                  onChangeText={(v) => update("clubSuburb", v)}
                />
                <Input
                  label="Postcode (required)"
                  value={form.clubPostcode}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 4);
                    update("clubPostcode", digits);
                  }}
                  keyboardType="number-pad"
                />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>State (required)</Text>
                <View style={styles.wrapRow}>
                  {states.map((s) => (
                    <Choice key={s} label={s} active={form.state === s} onPress={() => update("state", s)} colors={colors} />
                  ))}
                </View>
                <Input label="Club Website Address (optional)" value={form.clubWebsite} onChangeText={(v) => update("clubWebsite", v)} />
                <Input
                  label="Club Contact Email Address (required)"
                  value={form.clubContactEmail}
                  onChangeText={(v) => update("clubContactEmail", v)}
                  keyboardType="email-address"
                />
                <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>
                  This defaults to your sign-up email. You can change it to a different public contact address — your login email will not be affected.
                </Text>
                <Input
                  label="Club Contact Mobile Number (required)"
                  value={form.clubContactMobile}
                  onChangeText={(v) => update("clubContactMobile", v)}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Club Bio (optional, max 200 words)"
                  value={form.bio}
                  onChangeText={(v) => {
                    const wordCount = v.trim().split(/\s+/).filter(Boolean).length;
                    if (wordCount <= 200) update("bio", v);
                  }}
                  multiline
                />
              </>
            ) : (
              <>
                {role === "guardian" && (
                  <Input
                    label="Parent/Guardian Full Name (required)"
                    value={form.parentGuardianName}
                    onChangeText={(v) => update("parentGuardianName", v)}
                  />
                )}
                {role === "guardian" ? (
                  <Input
                    label="Player's Full Name (required)"
                    value={form.playerName}
                    onChangeText={(v) => update("playerName", v)}
                  />
                ) : (
                  <Input
                    label="Full Name (required)"
                    value={form.fullName}
                    onChangeText={(v) => update("fullName", v)}
                  />
                )}

                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  {role === "guardian" ? "Player gender (required)" : "Gender (required)"}
                </Text>
                <View style={styles.wrapRow}>
                  {genders.map((g) => (
                    <Choice key={g} label={g} active={form.gender === g} onPress={() => update("gender", g)} colors={colors} />
                  ))}
                </View>

                <Pressable
                  onPress={() => { setDraftDob(form.dateOfBirth); setShowDobPicker(true); }}
                  style={({ pressed }) => [
                    styles.dobButton,
                    { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    {role === "guardian" ? "Player Date of Birth (required)" : "Date of Birth (required)"}
                  </Text>
                  <Text style={[styles.dobValue, { color: form.dateOfBirth ? colors.foreground : colors.mutedForeground }]}>
                    {form.dateOfBirth ? `${form.dateOfBirth}${age ? ` · Age ${age}` : ""}` : "Tap to choose a date"}
                  </Text>
                </Pressable>

                <Modal transparent visible={showDobPicker} animationType="fade" onRequestClose={() => setShowDobPicker(false)}>
                  <View style={styles.modalScrim}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose date of birth</Text>
                      <TextInput
                        value={draftDob}
                        onChangeText={(v) => setDraftDob(formatDobInput(v))}
                        placeholder="DD-MM-YYYY"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="number-pad"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      />
                      <View style={styles.modalActions}>
                        <Pressable
                          onPress={() => setShowDobPicker(false)}
                          style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}
                        >
                          <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            const parsed = parseDob(draftDob);
                            if (Number.isNaN(parsed.getTime())) return;
                            setDob(parsed);
                          }}
                          style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                        >
                          <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Set date</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>

                <Input label="Suburb (required)" value={form.suburb} onChangeText={(v) => update("suburb", v)} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>State (required)</Text>
                <View style={styles.wrapRow}>
                  {states.map((state) => (
                    <Choice key={state} label={state} active={form.state === state} onPress={() => update("state", state)} colors={colors} />
                  ))}
                </View>

                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    {role === "guardian" ? "Parent/Guardian Email Address" : "Email Address"}
                  </Text>
                  <View style={[styles.input, styles.readonlyInput, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 15 }}>{email}</Text>
                  </View>
                  <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>This is your sign-in email from your account.</Text>
                </View>

                <Input
                  label={role === "guardian" ? "Parent/Guardian Mobile Number (required)" : "Mobile Number (required)"}
                  value={form.mobile}
                  onChangeText={(v) => update("mobile", v)}
                  keyboardType="phone-pad"
                />
                <Input
                  label={role === "guardian" ? "Player Bio (optional, max 200 words)" : role === "coach" ? "Coach Bio (optional, max 200 words)" : "Bio (optional, max 200 words)"}
                  value={form.bio}
                  onChangeText={(v) => {
                    const wordCount = v.trim().split(/\s+/).filter(Boolean).length;
                    if (wordCount <= 200) update("bio", v);
                  }}
                  multiline
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  {role === "guardian" ? "Player sports played (required)" : role === "coach" ? "Sports coached (required)" : "Sports played (required)"}
                </Text>
                <SportPicker selectedSports={selectedSports} onToggle={toggleSport} approvedSports={approvedSports.map((s) => s.name)} />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Default Sport (required)</Text>
                <SportPicker
                  selectedSports={defaultSport ? [defaultSport] : []}
                  onToggle={(sport) => selectedSports.includes(sport) && setDefaultSport(sport)}
                  sports={selectedSports}
                  single
                  approvedSports={approvedSports.map((s) => s.name)}
                />
              </>
            )}

            {/* Profile picture */}
            <View style={styles.avatarPreviewRow}>
              <Image source={getDefaultAvatar(role, form.gender)} style={styles.avatarPreviewImg} contentFit="cover" />
              <View style={styles.avatarPreviewInfo}>
                <Text style={[styles.avatarPreviewLabel, { color: colors.foreground }]}>Your default profile picture</Text>
                <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                  Shown until your own photo is approved by an admin.
                </Text>
              </View>
            </View>
            <PrimaryButton
              label={profileImageId ? "Profile pic submitted for approval" : "Add profile pic for admin approval"}
              icon="image"
              onPress={pickImage}
            />
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
              Recommended 400 × 400 px. Min 200 × 200 px. Max 2 MB.
            </Text>

            {/* Social links */}
            <Input label="Instagram link (optional)" value={form.instagram} onChangeText={(v) => update("instagram", v)} />
            <Input label="Facebook link (optional)" value={form.facebook} onChangeText={(v) => update("facebook", v)} />
            <Input label="X link (optional)" value={form.x} onChangeText={(v) => update("x", v)} />
            <Input label="TikTok link (optional)" value={form.tiktok} onChangeText={(v) => update("tiktok", v)} />
            {!isClub && (
              <Input
                label="Highlight Reel (YouTube & Vimeo links only, optional, admin approved)"
                value={form.highlightReelUrl}
                onChangeText={(v) => update("highlightReelUrl", v)}
              />
            )}
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
              Profile pics and links are admin approved. Any inappropriate content will result in the account being removed and banned.
            </Text>

            <CheckRow
              active={Boolean(form.agreed)}
              label={
                isClub
                  ? "All the Club information I have provided is true and accurate. If a club account is found to be false or misleading, it will be shut down immediately."
                  : role === "guardian"
                  ? "All the player information I have provided is true and accurate. If a Parent/Guardian's Player account is found to be false or misleading, it will be shut down immediately."
                  : "All the player information I have provided is true and accurate. If a player account is found to be false or misleading, it will be shut down immediately."
              }
              onPress={() => update("agreed", !form.agreed)}
              colors={colors}
            />

            <PrimaryButton
              label="Create account"
              icon="user-check"
              onPress={submit}
              disabled={!requiredDetailsValid || !socialLinksValid || (isClub && !form.agreed)}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Internal sub-components ───────────────────────────────────────────────────

function SportPicker({
  selectedSports: selected,
  onToggle,
  single,
  sports,
  approvedSports,
}: {
  selectedSports: string[];
  onToggle: (sport: string) => void;
  single?: boolean;
  sports?: string[];
  approvedSports: string[];
}) {
  const colors = useColors();
  const list = sports?.length ? sports : approvedSports;
  return (
    <View style={styles.wrapRow}>
      {list.map((sport) => (
        <Choice key={sport} label={sport} active={selected.includes(sport)} onPress={() => onToggle(sport)} colors={colors} />
      ))}
      {single && list.length === 0 && (
        <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Choose at least one sport first.</Text>
      )}
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: active ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.choiceText, { color: active ? colors.primaryForeground : colors.secondaryForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
          multiline ? styles.multiline : undefined,
        ]}
      />
    </View>
  );
}

function CheckRow({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkBox, { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.primary }]}>
        {active ? <Feather name="check" color={colors.primaryForeground} size={14} /> : null}
      </View>
      <Text style={[styles.checkText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  brand: { alignItems: "center", gap: 10 },
  logo: { width: 180, height: 180, borderRadius: 44 },
  brandTitle: { fontWeight: "800", fontSize: 26, textAlign: "center", letterSpacing: -0.7 },
  brandText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  signOutLink: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, paddingVertical: 4, paddingHorizontal: 10 },
  signOutText: { fontWeight: "600", fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 30, padding: 18, gap: 14 },
  cardTitle: { fontWeight: "800", fontSize: 23, letterSpacing: -0.4 },
  roleCard: { borderRadius: 22, padding: 16, gap: 4 },
  roleTitle: { fontWeight: "800", fontSize: 15, lineHeight: 20 },
  roleText: { fontWeight: "500", fontSize: 13, lineHeight: 18 },
  infoNote: { fontSize: 12, lineHeight: 17, fontStyle: "italic", marginTop: -4 },
  inputWrap: { gap: 7 },
  label: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 16, minHeight: 48, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  readonlyInput: { justifyContent: "center" },
  multiline: { minHeight: 96, textAlignVertical: "top", paddingTop: 12 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  choiceText: { fontWeight: "800", fontSize: 12 },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkBox: { width: 22, height: 22, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkText: { flex: 1, fontWeight: "600", fontSize: 13, lineHeight: 19 },
  smallPrint: { fontWeight: "500", fontSize: 12, lineHeight: 18 },
  dobButton: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  dobValue: { fontWeight: "600", fontSize: 15 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderWidth: 1, borderRadius: 28, padding: 22, gap: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  backBtnText: { fontWeight: "700", fontSize: 13 },
  avatarPreviewRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarPreviewImg: { width: 72, height: 72, borderRadius: 36 },
  avatarPreviewInfo: { flex: 1, gap: 4 },
  avatarPreviewLabel: { fontWeight: "700", fontSize: 14 },
});
