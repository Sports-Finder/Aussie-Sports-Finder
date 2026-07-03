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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton, ProfileAvatar } from "@/components/SportsUI";
import { SuburbAutocomplete } from "@/components/SuburbAutocomplete";
import { AccountRole, AuthMethod, SocialLinks, useSportsConnect } from "@/context/SportsConnectContext";
import { getDefaultAvatar } from "@/constants/defaultAvatars";
import { defaultSportThemes, getSportTheme } from "@/constants/sports";
import { COACH_EXPERIENCE_LEVELS, TD_EXPERIENCE_LEVELS } from "@/constants/coachLevels";
import { COACH_SUB_ROLES, coachSubRoleLabel } from "@/constants/coachSubRoles";
import { useColors } from "@/hooks/useColors";
import { detectContactInfo } from "@/utils/contactDetection";
import { useRouter } from "expo-router";

const logo = require("@/assets/images/icon.png") as number;
const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const genders = ["Male", "Female", "Pref Not to Say"];

type SetupStep = "type" | "details";

const roleCopy: Record<AccountRole, { title: string; subtitle: string }> = {
  player: { title: "I am a Player (18+ only) looking for a Club.", subtitle: "Create a player profile for clubs to review after connection." },
  guardian: { title: "I am a Parent/Guardian of an underage Player (17 years and under) looking for a Club.", subtitle: "Create a player profile managed on behalf of a parent or guardian." },
  coach: { title: "I am a Coach / Assistant Coach / Trainer / TD looking for a team or club.", subtitle: "Create a coach profile for clubs to review after connection." },
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
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();

  const { bannedEmails, createAccount, approvedSports, pickAccountImage, clearProfileImage, getImageUri, getImageStatus, accounts, isHydrated, autoRestoreSession } = useSportsConnect();

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
  const [dobPickerTarget, setDobPickerTarget] = useState<"player" | "guardian">("player");
  const [draftGuardianDob, setDraftGuardianDob] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    parentGuardianName: "",
    playerName: "",
    clubName: "",
    gender: "",
    dateOfBirth: "",
    guardianDateOfBirth: "",
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
    playerPositions: [] as string[],
    playerCurrentLevel: "",
    playerCurrentAgeGroup: "",
    playerCurrentClub: "",
    coachSubRole: "",
    coachCurrentLevel: "",
    coachCurrentClub: "",
    agreed: false,
    ageAttested: false,
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
        form.clubContactEmail.includes("@")
      );
    }
    const nameValid = role === "guardian"
      ? Boolean(form.parentGuardianName.trim() && form.playerName.trim())
      : Boolean(form.fullName.trim());
    const guardianAgeValid = role === "guardian" ? Boolean(age && Number(age) <= 17) : true;
    const playerAgeValid = role === "player" ? Boolean(age && Number(age) >= 18) : true;
    const coachAgeValid = role === "coach" ? Boolean(age && Number(age) >= 18) : true;
    const coachSubRoleValid = role === "coach" ? Boolean(form.coachSubRole) : true;
    const guardianDobValid = role === "guardian" ? Boolean(form.guardianDateOfBirth) : true;
    const guardianDobAge = role === "guardian" ? calculateAge(form.guardianDateOfBirth) : "";
    const guardianOwnAgeValid = role === "guardian" ? Boolean(guardianDobAge && Number(guardianDobAge) >= 18) : true;
    return Boolean(
      nameValid && form.gender && form.dateOfBirth &&
      guardianAgeValid && playerAgeValid && coachAgeValid &&
      selectedSports.length && defaultSport && form.agreed &&
      coachSubRoleValid && guardianDobValid && guardianOwnAgeValid &&
      form.ageAttested
    );
  }, [age, defaultSport, form, isClub, role, selectedSports.length]);

  const update = (key: keyof typeof form, value: string | boolean | string[]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const selectRole = (selected: AccountRole) => {
    // If the user already entered a DOB and is under 18, block "player" and "coach" roles
    // and force them into the Parent/Guardian flow.
    if (selected === "player" || selected === "coach") {
      const dobAge = calculateAge(form.dateOfBirth);
      if (dobAge && Number(dobAge) < 18) {
        Alert.alert(
          "Age requirement",
          `You must be 18 or older to create a ${selected === "player" ? "Player" : "Coach"} account. Please select Parent/Guardian instead.`,
          [{ text: "OK", onPress: () => { setRole("guardian"); setStep("details"); } }],
        );
        return;
      }
    }
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
  const setGuardianDob = (date: Date) => {
    update("guardianDateOfBirth", formatDob(date));
    setShowDobPicker(false);
  };

  const pickImage = async () => {
    const owner = isClub
      ? form.clubName || "Club account"
      : role === "guardian"
      ? form.playerName || "Guardian player account"
      : form.fullName || `${role} account`;
    const imageId = await pickAccountImage(owner, profileImageId);
    if (imageId) setProfileImageId(imageId);
  };

  const handleClearImage = async () => {
    if (profileImageId) {
      await clearProfileImage(profileImageId);
      setProfileImageId(undefined);
    }
  };

  const submit = () => {
    if (!socialLinksValid) {
      Alert.alert("Social link error", "Only Instagram, Facebook, X/Twitter and TikTok profile links are accepted.");
      return;
    }
    // Explicit guard: if user under 18 and selected player or coach, block them
    if (age && Number(age) < 18 && (role === "player" || role === "coach")) {
      Alert.alert(
        "Age requirement",
        `You must be 18 or older to create a ${role === "player" ? "Player" : "Coach"} account. Please switch to Parent/Guardian.`,
        [{ text: "OK" }],
      );
      return;
    }
    // Explicit guard: if guardian's own DOB shows they are under 18, block them
    if (role === "guardian") {
      const guardianOwnAge = calculateAge(form.guardianDateOfBirth);
      if (guardianOwnAge && Number(guardianOwnAge) < 18) {
        Alert.alert("Guardian age requirement", "The parent/guardian must be 18 or older.");
        return;
      }
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
      guardianDateOfBirth: role === "guardian" ? form.guardianDateOfBirth : undefined,
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
      playerPositions: form.playerPositions,
      playerCurrentLevel: form.playerCurrentLevel || undefined,
      playerCurrentAgeGroup: form.playerCurrentAgeGroup || undefined,
      playerCurrentClub: form.playerCurrentClub || undefined,
      coachSubRole: form.coachSubRole || undefined,
      coachCurrentLevel: form.coachCurrentLevel || undefined,
      coachCurrentClub: form.coachCurrentClub || undefined,
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
      clerkUserId: user?.id,
      ageAttested: true,
      ageAttestedAt: new Date().toISOString(),
    });
    if (!created) return;

    const roleLabel =
      role === "guardian"
        ? "parent/guardian"
        : role === "coach"
          ? "coach"
          : "player";

    if (role === "club") {
      Alert.alert(
        "Account submitted",
        "Your club account has been submitted and is awaiting admin approval. You can check your approval status anytime in the Profile tab.",
        [{ text: "View Profile", onPress: () => router.push("/(tabs)/profile") }],
      );
    } else {
      Alert.alert(
        "Account created",
        `By creating this ${roleLabel} account, you agree to use this application and your account only for its intended and lawful purpose and agree to our Terms & Conditions. Any misuse, unauthorized activity, or violation of our terms may result in immediate suspension or permanent banning of your account and associated email address.`,
        [{ text: "OK" }],
      );
    }
  };

  // After hydration, if an active account already exists for this Clerk email, show a
  // "Welcome back" screen instead of the setup form. This replaces the silent
  // auto-restore that previously happened in _layout.tsx and makes the transition explicit.
  const existingAccount = isHydrated
    ? accounts.find(
        (a) =>
          a.email.toLowerCase() === email.toLowerCase() &&
          a.status !== "banned" &&
          a.status !== "closed",
      )
    : undefined;

  if (existingAccount) {
    const displayName =
      existingAccount.role === "club"
        ? existingAccount.clubName
        : existingAccount.role === "guardian"
          ? existingAccount.playerName || existingAccount.fullName
          : existingAccount.fullName;
    const roleLabel =
      existingAccount.role === "club"
        ? "Club"
        : existingAccount.role === "guardian"
          ? "Parent / Guardian"
          : existingAccount.role === "coach"
            ? "Coach"
            : "Player";
    return (
      <KeyboardAvoidingView behavior="padding" style={[styles.shell, { backgroundColor: colors.background }]}>
        <Image
          source={require("../assets/images/wood-texture.jpg")}
          style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
          resizeMode="cover"
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 34, alignItems: "center" },
          ]}
        >
          <View style={styles.brand}>
            <Image source={logo} style={styles.logo} contentFit="contain" />
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>Aussie Sports Club Finder</Text>
          </View>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card, width: "100%", alignItems: "center", gap: 10, marginTop: 12 }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: "center", fontSize: 20 }]}>
              Welcome back{displayName ? `, ${displayName}` : ""}!
            </Text>
            <View style={[styles.choice, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.choiceText, { color: colors.primary }]}>{roleLabel}</Text>
            </View>
            <Text style={[styles.brandText, { color: colors.mutedForeground }]}>
              Your existing account was found. Tap below to continue.
            </Text>
            {existingAccount.role === "club" && existingAccount.clubApprovalStatus !== "approved" && (
              <View style={{ backgroundColor: existingAccount.clubApprovalStatus === "rejected" ? "#FEF2F2" : "#FFFBEB", borderColor: existingAccount.clubApprovalStatus === "rejected" ? "#FECACA" : "#FDE68A", borderWidth: 1, borderRadius: 10, padding: 10, width: "100%" }}>
                <Text style={{ fontSize: 12, color: existingAccount.clubApprovalStatus === "rejected" ? "#DC2626" : "#92400E", fontWeight: "600", textAlign: "center" }}>
                  {existingAccount.clubApprovalStatus === "rejected"
                    ? "Your club application was not approved. See your Profile for details."
                    : "Your club account is still awaiting admin approval. Check your Profile tab for status updates."}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => autoRestoreSession(email, authMethod, socialId)}
              style={({ pressed }) => [
                styles.roleCard,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                  width: "100%",
                  alignItems: "center",
                  borderRadius: 16,
                  marginTop: 4,
                },
              ]}
            >
              <Text style={[styles.roleTitle, { color: colors.primaryForeground, fontSize: 16 }]}>
                Continue to app
              </Text>
            </Pressable>
          </View>
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
            style={({ pressed }) => [styles.signOutLink, { opacity: pressed ? 0.6 : 1, marginTop: 16 }]}
          >
            <Feather name="log-out" size={13} color={colors.mutedForeground} />
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.shell, { backgroundColor: colors.background }]}>
      <Image
        source={require("../assets/images/wood-texture.jpg")}
        style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
        resizeMode="cover"
      />
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
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
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
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
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
                <SuburbAutocomplete
                  label="Suburb (required)"
                  required
                  value={form.clubSuburb}
                  onSelect={({ suburb, postcode, state }) => {
                    update("clubSuburb", suburb);
                    update("clubPostcode", postcode);
                    update("state", state);
                  }}
                />
                {form.clubSuburb ? (
                  <Text style={[styles.infoNote, { color: colors.mutedForeground, marginTop: -6, marginBottom: 12 }]}>
                    {form.state}{form.clubPostcode ? ` · ${form.clubPostcode}` : ""}
                  </Text>
                ) : null}
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
                  label="Club Contact Mobile Number (optional)"
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
                {detectContactInfo(form.bio) ? <Text style={{ fontSize: 12, color: "#D9534F", marginTop: 4 }}>{detectContactInfo(form.bio)}</Text> : null}
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
                {role === "guardian" && (
                  <>
                    <Pressable
                      onPress={() => { setDraftGuardianDob(form.guardianDateOfBirth); setDobPickerTarget("guardian"); setShowDobPicker(true); }}
                      style={({ pressed }) => [
                        styles.dobButton,
                        { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, opacity: pressed ? 0.78 : 1 },
                      ]}
                    >
                      <Text style={[styles.label, { color: colors.mutedForeground }]}>Parent/Guardian Date of Birth (required)</Text>
                      <Text style={[styles.dobValue, { color: form.guardianDateOfBirth ? colors.foreground : colors.mutedForeground }]}>
                        {form.guardianDateOfBirth ? `${form.guardianDateOfBirth} · Age ${calculateAge(form.guardianDateOfBirth)}` : "Tap to choose a date"}
                      </Text>
                    </Pressable>
                    {(() => {
                      const guardianAge = calculateAge(form.guardianDateOfBirth);
                      if (guardianAge && Number(guardianAge) < 18) {
                        return (
                          <Text style={{ fontSize: 12, color: "#D9534F", marginTop: 4 }}>
                            You must be 18 years or older to create this account. You must be the parent or a legal guardian of the player you are creating this account for.
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </>
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
                  onPress={() => { setDraftDob(form.dateOfBirth); setDobPickerTarget("player"); setShowDobPicker(true); }}
                  style={({ pressed }) => [
                    styles.dobButton,
                    { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, opacity: pressed ? 0.78 : 1 },
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
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{dobPickerTarget === "guardian" ? "Choose guardian date of birth" : "Choose date of birth"}</Text>
                      <TextInput
                        value={dobPickerTarget === "guardian" ? draftGuardianDob : draftDob}
                        onChangeText={(v) => {
                          if (dobPickerTarget === "guardian") setDraftGuardianDob(formatDobInput(v));
                          else setDraftDob(formatDobInput(v));
                        }}
                        placeholder="DD-MM-YYYY"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="number-pad"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
                            const target = dobPickerTarget === "guardian" ? draftGuardianDob : draftDob;
                            const parsed = parseDob(target);
                            if (Number.isNaN(parsed.getTime())) return;
                            if (dobPickerTarget === "guardian") setGuardianDob(parsed);
                            else setDob(parsed);
                          }}
                          style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                        >
                          <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Set date</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>

                <SuburbAutocomplete
                  label="Suburb (required)"
                  required
                  value={form.suburb}
                  onSelect={({ suburb, state }) => {
                    update("suburb", suburb);
                    update("state", state);
                  }}
                />
                {form.suburb ? (
                  <Text style={[styles.infoNote, { color: colors.mutedForeground, marginTop: -6, marginBottom: 12 }]}>
                    {form.state}
                  </Text>
                ) : null}

                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    {role === "guardian" ? "Parent/Guardian Email Address" : "Email Address"}
                  </Text>
                  <View style={[styles.input, styles.readonlyInput, { backgroundColor: colors.secondary, borderColor: colors.foreground, borderWidth: 2 }]}>
                    <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 15 }}>{email}</Text>
                  </View>
                  <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>This is your sign-in email from your account.</Text>
                </View>

                <Input
                  label={role === "guardian" ? "Parent/Guardian Mobile Number (optional)" : "Mobile Number (optional)"}
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
                {detectContactInfo(form.bio) ? <Text style={{ fontSize: 12, color: "#D9534F", marginTop: 4 }}>{detectContactInfo(form.bio)}</Text> : null}

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

                {role === "coach" && (
                  <>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>What type of coaching role? (required)</Text>
                    <View style={styles.wrapRow}>
                      {COACH_SUB_ROLES.map((sr) => (
                        <Choice key={sr.value} label={sr.label} active={form.coachSubRole === sr.value} onPress={() => update("coachSubRole", sr.value)} colors={colors} />
                      ))}
                    </View>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>
                      {form.coachSubRole === "td" ? "TD expertise level (optional)" : "Current coaching level (optional)"}
                    </Text>
                    <View style={styles.wrapRow}>
                      {(form.coachSubRole === "td" ? TD_EXPERIENCE_LEVELS : COACH_EXPERIENCE_LEVELS).map((level) => (
                        <Choice key={level.value} label={level.label} active={form.coachCurrentLevel === level.value} onPress={() => update("coachCurrentLevel", level.value)} colors={colors} />
                      ))}
                    </View>
                    <Input label="Current or previous club (optional)" value={form.coachCurrentClub} onChangeText={(v) => update("coachCurrentClub", v)} placeholder="e.g. Northside FC" />
                  </>
                )}
                {role !== "coach" && (
                  <>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>
                      Positions played
                      {defaultSport ? ` for ${defaultSport}` : ""}
                    </Text>
                    <View style={styles.wrapRow}>
                      {(() => {
                        const sportTheme = getSportTheme(defaultSport, defaultSportThemes);
                        if (sportTheme.positions.length === 0) {
                          return <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>No preset positions for this sport.</Text>;
                        }
                        return sportTheme.positions.map((pos) => (
                          <Choice
                            key={pos}
                            label={pos}
                            active={form.playerPositions.includes(pos)}
                            onPress={() => {
                              const current = form.playerPositions;
                              const next = current.includes(pos)
                                ? current.filter((p) => p !== pos)
                                : [...current, pos];
                              update("playerPositions", next);
                            }}
                            colors={colors}
                          />
                        ));
                      })()}
                    </View>
                    <Input label="Current playing level (optional)" value={form.playerCurrentLevel} onChangeText={(v) => update("playerCurrentLevel", v)} placeholder="e.g. Competitive, Social" />
                    <Input label="Current playing age group (optional)" value={form.playerCurrentAgeGroup} onChangeText={(v) => update("playerCurrentAgeGroup", v)} placeholder="e.g. Under 14s, Open Age" />
                    <Input label="Current or previous club (optional)" value={form.playerCurrentClub} onChangeText={(v) => update("playerCurrentClub", v)} placeholder="e.g. Northside FC" />
                  </>
                )}
              </>
            )}

            {/* Profile picture */}
            {profileImageId ? (
              <View style={styles.avatarPreviewRow}>
                <ProfileAvatar
                  uri={getImageUri(profileImageId, true)}
                  fallback={getDefaultAvatar(role, form.gender)}
                  size={72}
                  pending={true}
                />
                <View style={styles.avatarPreviewInfo}>
                  <Text style={[styles.avatarPreviewLabel, { color: colors.foreground }]}>
                    Profile pic submitted for approval
                  </Text>
                  <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                    Your image is awaiting admin approval.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.avatarPreviewRow}>
                <Image source={getDefaultAvatar(role, form.gender)} style={styles.avatarPreviewImg} contentFit="cover" />
                <View style={styles.avatarPreviewInfo}>
                  <Text style={[styles.avatarPreviewLabel, { color: colors.foreground }]}>Your default profile picture</Text>
                  <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                    Shown until your own photo is approved by an admin.
                  </Text>
                </View>
              </View>
            )}
            <PrimaryButton
              label={profileImageId ? "Change profile pic" : "Add profile pic for admin approval"}
              icon="image"
              onPress={pickImage}
            />
            {profileImageId && (
              <PrimaryButton
                label="Clear profile pic"
                icon="trash-2"
                onPress={handleClearImage}
              />
            )}
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
              active={Boolean(form.ageAttested)}
              onPress={() => update("ageAttested", !form.ageAttested)}
              colors={colors}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500", lineHeight: 20 }}>
                {role === "guardian"
                  ? "I confirm I am 18 years or older and I am the parent or legal guardian of the player. I understand that misrepresenting my age or guardianship is a breach of the Terms of Service and may result in account termination and reporting to relevant authorities."
                  : "I confirm I am 18 years or older. I understand that misrepresenting my age is a breach of the Terms of Service and may result in account termination and reporting to relevant authorities."}
                <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => router.push("/terms-of-service")}> Read our Terms of Service</Text>
              </Text>
            </CheckRow>

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
              disabled={!requiredDetailsValid || !socialLinksValid || (isClub && !form.agreed) || !!detectContactInfo(form.bio)}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
  placeholder?: string;
}) {
  const colors = useColors();
  const [showText, setShowText] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 0, paddingRight: secureTextEntry ? 8 : undefined }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry ? !showText : false}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[
            { flex: 1, color: colors.foreground, fontWeight: "600", fontSize: 15, paddingHorizontal: 14, minHeight: 48 },
            multiline ? styles.multiline : undefined,
          ]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setShowText((p) => !p)} style={{ padding: 6, marginRight: 4 }}>
            <Feather name={showText ? "eye-off" : "eye"} size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CheckRow({
  active,
  label,
  onPress,
  colors,
  children,
}: {
  active: boolean;
  label?: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  children?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkBox, { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.primary }]}>
        {active ? <Feather name="check" color={colors.primaryForeground} size={14} /> : null}
      </View>
      {children ? (
        <View style={{ flex: 1 }}>{children}</View>
      ) : (
        <Text style={[styles.checkText, { color: colors.foreground }]}>{label}</Text>
      )}
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
