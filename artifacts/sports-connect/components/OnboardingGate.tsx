import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/SportsUI";
import { AccountRole, AuthMethod, SocialLinks, useSportsConnect } from "@/context/SportsConnectContext";
import { getDefaultAvatar } from "@/constants/defaultAvatars";
import { useColors } from "@/hooks/useColors";

const logo = require("@/assets/images/icon.png");
const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const genders = ["Male", "Female", "Pref Not to Say"];

type Step = "auth" | "verify" | "email-signup" | "email-login" | "type" | "details";

const roleCopy: Record<AccountRole, { title: string; subtitle: string }> = {
  player: { title: "I am a Player (18+ only) looking for a Club.", subtitle: "Create a player profile for clubs to review after connection." },
  guardian: { title: "I am a Parent/Guardian of an underage Player (17 years and under) looking for a Club.", subtitle: "Create a player profile managed on behalf of a parent or guardian." },
  coach: { title: "I am a Coach looking for a Club.", subtitle: "Create a coach profile for clubs to review after connection." },
  club: { title: "I am a Club looking for Players or Coaches.", subtitle: "Create a club profile, address and contact details." },
};

function calculateAge(dateOfBirth: string) {
  const dob = parseDob(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? `${age}` : "";
}

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
  const parts = [];
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

function isAustralianLocation(value: string) {
  const upper = value.toUpperCase();
  return states.some((state) => upper.includes(state)) || value.trim().length > 3;
}

function getStateOptions() {
  return states;
}

function isValidSocialLink(platform: keyof SocialLinks, value: string) {
  if (!value.trim()) return true;
  const allowed = {
    instagram: ["instagram.com"],
    facebook: ["facebook.com", "fb.com"],
    x: ["x.com", "twitter.com"],
    tiktok: ["tiktok.com"],
  }[platform];
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return allowed.some((domain) => url.hostname.replace(/^www\./, "").endsWith(domain));
  } catch {
    return false;
  }
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentAccount, isAdmin, adminLogin, approvedSports, createAccount, loginWithEmail, pickAccountImage, signOutResetToken } = useSportsConnect();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [step, setStep] = useState<Step>("auth");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaPassed, setRecaptchaPassed] = useState(false);
  const [humanChecked, setHumanChecked] = useState(false);
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

  React.useEffect(() => {
    setStep("auth");
    setAuthMethod("email");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaPassed(false);
    setHumanChecked(false);
    setRole("player");
    setProfileImageId(undefined);
    setShowDobPicker(false);
    setDraftDob("");
    setForm({
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
    setSelectedSports([]);
    setDefaultSport("");
  }, [signOutResetToken]);

  const age = calculateAge(form.dateOfBirth);
  const isClub = role === "club";
  const primaryEmail = isClub ? form.clubContactEmail || email : email;

  const socialLinksValid = useMemo(() => (
    isValidSocialLink("instagram", form.instagram) &&
    isValidSocialLink("facebook", form.facebook) &&
    isValidSocialLink("x", form.x) &&
    isValidSocialLink("tiktok", form.tiktok)
  ), [form.facebook, form.instagram, form.tiktok, form.x]);

  const requiredDetailsValid = useMemo(() => {
    if (!humanChecked || !primaryEmail.includes("@")) return false;
    if (isClub) {
      return Boolean(form.clubName.trim() && defaultSport && isAustralianLocation(form.clubAddress) && form.clubContactEmail.includes("@") && form.clubContactMobile.trim());
    }
    const nameValid = role === "guardian" ? Boolean(form.parentGuardianName.trim() && form.playerName.trim()) : Boolean(form.fullName.trim());
    const guardianAgeValid = role === "guardian" ? Boolean(age && Number(age) <= 17) : true;
    const playerAgeValid = role === "player" ? Boolean(age && Number(age) >= 18) : true;
    return Boolean(nameValid && form.gender && form.dateOfBirth && guardianAgeValid && playerAgeValid && isAustralianLocation(`${form.suburb} ${form.state}`) && form.suburb.trim() && form.state && form.mobile.trim() && selectedSports.length && defaultSport);
  }, [age, defaultSport, form, humanChecked, isClub, primaryEmail, role, selectedSports.length]);

  if (currentAccount || isAdmin) return <>{children}</>;

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const beginAuth = (method: AuthMethod) => {
    setAuthMethod(method);
    if (method === "apple") {
      setEmail("apple.user@privaterelay.appleid.com");
      setHumanChecked(true);
      setStep("type");
      return;
    }
    if (method === "google") {
      setEmail("google.user@gmail.com");
      setHumanChecked(true);
      setStep("type");
      return;
    }
    setStep("verify");
  };

  const signupValid = email.includes("@") && password.length >= 8 && password === confirmPassword && recaptchaPassed;

  const handleEmailSignup = () => {
    setHumanChecked(true);
    setStep("type");
  };

  const handleEmailLogin = () => {
    const ok = loginWithEmail(email, password);
    if (!ok) {
      Alert.alert("Login failed", "No account found with that email and password. Please check your details and try again.");
    }
  };

  const toggleSport = (sport: string) => {
    setSelectedSports((current) => {
      const next = current.includes(sport) ? current.filter((item) => item !== sport) : [...current, sport];
      if (!next.includes(defaultSport)) setDefaultSport(next[0] ?? "");
      return next;
    });
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
    createAccount({
      role,
      authMethod,
      email: primaryEmail,
      fullName: form.fullName,
      parentGuardianName: form.parentGuardianName,
      playerName: form.playerName,
      clubName: form.clubName,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      location: isClub ? form.clubAddress : `${form.suburb} ${form.state}`.trim(),
      mobile: isClub ? form.clubContactMobile : form.mobile,
      sports: isClub ? [defaultSport] : selectedSports,
      defaultSport,
      profileImageId,
      socialLinks: { instagram: form.instagram, facebook: form.facebook, x: form.x, tiktok: form.tiktok },
      highlightReelUrl: form.highlightReelUrl,
      highlightReelStatus: form.highlightReelUrl ? "pending" : undefined,
      clubWebsite: form.clubWebsite,
      clubAddress: form.clubAddress,
      clubContactEmail: form.clubContactEmail,
      clubContactMobile: form.clubContactMobile,
      password: authMethod === "email" ? password : undefined,
    });
    Alert.alert("Account submitted", "A pop up notification will be sent out once approved.");
  };

  const pickImage = async () => {
    const owner = isClub ? form.clubName || "Club account" : role === "guardian" ? form.playerName || "Guardian player account" : form.fullName || `${role} account`;
    const imageId = await pickAccountImage(owner);
    if (imageId) setProfileImageId(imageId);
  };

  const setDob = (date: Date) => {
    const next = formatDob(date);
    update("dateOfBirth", next);
    setShowDobPicker(false);
  };

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 34 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>Aussie Sports Club Finder</Text>
          <Text style={[styles.brandText, { color: colors.mutedForeground }]}>Sign up, choose your account type, then create the profile clubs and players see after a connection is accepted.</Text>
        </View>

        {step === "auth" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Login or sign up</Text>
            <PrimaryButton label="Continue with Apple" icon="smartphone" onPress={() => beginAuth("apple")} />
            <PrimaryButton label="Continue with Google" icon="mail" onPress={() => beginAuth("google")} />
            <PrimaryButton label="Continue with Email" icon="at-sign" onPress={() => beginAuth("email")} />
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Email sign ups include verification and bot detection before account setup.</Text>
            <Pressable onPress={() => { setAdminPasscodeInput(""); setShowAdminModal(true); }} style={styles.adminLink}>
              <Text style={[styles.adminLinkText, { color: colors.mutedForeground }]}>Admin access</Text>
            </Pressable>
          </View>
        ) : null}

        <Modal transparent visible={showAdminModal} animationType="fade" onRequestClose={() => setShowAdminModal(false)}>
          <View style={styles.modalScrim}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Admin login</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Enter your admin passcode to access moderation tools.</Text>
              <TextInput
                value={adminPasscodeInput}
                onChangeText={setAdminPasscodeInput}
                placeholder="Admin passcode"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setShowAdminModal(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const ok = adminLogin(adminPasscodeInput);
                    if (ok) {
                      setShowAdminModal(false);
                    } else {
                      Alert.alert("Incorrect passcode", "The passcode you entered is incorrect. Please try again.");
                    }
                  }}
                  style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Login</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {step === "verify" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setStep("auth")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to login or sign up</Text>
            </Pressable>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Email Accounts</Text>
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Create a new account with email or sign in to an existing one.</Text>
            <PrimaryButton label="Sign Up with Email" icon="user-plus" onPress={() => { setEmail(""); setPassword(""); setConfirmPassword(""); setRecaptchaPassed(false); setStep("email-signup"); }} />
            <PrimaryButton label="Login with Email" icon="log-in" onPress={() => { setEmail(""); setPassword(""); setStep("email-login"); }} />
          </View>
        ) : null}

        {step === "email-signup" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setStep("verify")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to email accounts</Text>
            </Pressable>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sign Up with Email</Text>
            <Input label="Email Address (required)" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <View style={styles.passwordWrap}>
              <View style={styles.passwordRow}>
                <View style={styles.passwordFlex}>
                  <Input label="Password (min. 8 characters)" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                </View>
                <Pressable onPress={() => setShowPassword(!showPassword)} style={[styles.eyeBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.secondaryForeground} />
                </Pressable>
              </View>
              <View style={styles.passwordRow}>
                <View style={styles.passwordFlex}>
                  <Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
                </View>
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={[styles.eyeBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={18} color={colors.secondaryForeground} />
                </Pressable>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword ? (
                <Text style={[styles.errorText, { color: "#EF4444" }]}>Passwords do not match.</Text>
              ) : null}
            </View>
            <CheckRow active={recaptchaPassed} label="I am not a robot (reCAPTCHA)" onPress={() => setRecaptchaPassed(!recaptchaPassed)} />
            <PrimaryButton label="Continue to Account Set Up" icon="arrow-right" onPress={handleEmailSignup} disabled={!signupValid} />
          </View>
        ) : null}

        {step === "email-login" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setStep("verify")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to email accounts</Text>
            </Pressable>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Login with Email</Text>
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Sign in to your existing account.</Text>
            <Input label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <View style={styles.passwordRow}>
              <View style={styles.passwordFlex}>
                <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              </View>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={[styles.eyeBtn, { backgroundColor: colors.secondary }]}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.secondaryForeground} />
              </Pressable>
            </View>
            <PrimaryButton label="Login" icon="log-in" onPress={handleEmailLogin} disabled={!email.includes("@") || password.length < 1} />
          </View>
        ) : null}

        {step === "type" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setStep("auth")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to login or sign up</Text>
            </Pressable>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Create an account</Text>
            {(Object.keys(roleCopy) as AccountRole[]).map((item) => (
              <Pressable key={item} onPress={() => { setRole(item); setStep("details"); }} style={({ pressed }) => [styles.roleCard, { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[styles.roleTitle, { color: colors.secondaryForeground }]}>{roleCopy[item].title}</Text>
                <Text style={[styles.roleText, { color: colors.mutedForeground }]}>{roleCopy[item].subtitle}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === "details" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setStep("type")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to create an account</Text>
            </Pressable>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{isClub ? "Club account setup" : role === "guardian" ? "Parent/Guardian player setup" : role === "coach" ? "Coach account setup" : "Player account setup"}</Text>
            {isClub ? (
              <>
                <Input label="Club Name (required)" value={form.clubName} onChangeText={(value) => update("clubName", value)} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Sport (required)</Text>
                <SportPicker selectedSports={defaultSport ? [defaultSport] : []} onToggle={(sport) => setDefaultSport(sport)} single />
                <Input label="Full Address including Suburb, City and State (Australia only) (required)" value={form.clubAddress} onChangeText={(value) => update("clubAddress", value)} />
                <Input label="Club Website Address (optional)" value={form.clubWebsite} onChangeText={(value) => update("clubWebsite", value)} />
                <Input label="Club Contact Email Address (required)" value={form.clubContactEmail} onChangeText={(value) => update("clubContactEmail", value)} keyboardType="email-address" />
                <Input label="Club Contact Mobile Number (required)" value={form.clubContactMobile} onChangeText={(value) => update("clubContactMobile", value)} keyboardType="phone-pad" />
              </>
            ) : (
              <>
                {role === "guardian" ? <Input label="Parent/Guardian Full Name (required)" value={form.parentGuardianName} onChangeText={(value) => update("parentGuardianName", value)} /> : null}
                {role === "guardian" ? <Input label="Player's Full Name (required)" value={form.playerName} onChangeText={(value) => update("playerName", value)} /> : <Input label="Full Name (required)" value={form.fullName} onChangeText={(value) => update("fullName", value)} />}
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{role === "guardian" ? "Player gender (required)" : "Gender (required)"}</Text>
                <View style={styles.wrapRow}>{genders.map((gender) => <Choice key={gender} label={gender} active={form.gender === gender} onPress={() => update("gender", gender)} />)}</View>
                <Pressable onPress={() => { setDraftDob(form.dateOfBirth); setShowDobPicker(true); }} style={({ pressed }) => [styles.dobButton, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{`${role === "guardian" ? "Player " : ""}Date of Birth (required)`}</Text>
                  <Text style={[styles.dobValue, { color: form.dateOfBirth ? colors.foreground : colors.mutedForeground }]}>{form.dateOfBirth ? `${form.dateOfBirth}${age ? ` · Age ${age}` : ""}` : "Tap to choose a date"}</Text>
                </Pressable>
                <Modal transparent visible={showDobPicker} animationType="fade" onRequestClose={() => setShowDobPicker(false)}>
                  <View style={styles.modalScrim}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose date of birth</Text>
                      <View style={styles.dateRow}>
                        <TextInput value={draftDob} onChangeText={(value) => setDraftDob(formatDobInput(value))} placeholder="DD-MM-YYYY" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
                      </View>
                      <View style={styles.modalActions}>
                        <Pressable onPress={() => setShowDobPicker(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
                          <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                          const parsed = parseDob(draftDob);
                          if (Number.isNaN(parsed.getTime())) return;
                          setDob(parsed);
                        }} style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                          <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Set date</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>
                <Input label="Suburb (required)" value={form.suburb} onChangeText={(value) => update("suburb", value)} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>State (required)</Text>
                <View style={styles.wrapRow}>
                  {getStateOptions().map((state) => (
                    <Choice key={state} label={state} active={form.state === state} onPress={() => update("state", state)} />
                  ))}
                </View>
                <Input label={role === "guardian" ? "Parent/Guardian Email Address (required)" : "Email Address (required)"} value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Input label={role === "guardian" ? "Parent/Guardian Mobile Number (required)" : "Mobile Number (required)"} value={form.mobile} onChangeText={(value) => update("mobile", value)} keyboardType="phone-pad" />
                <Input label={role === "guardian" ? "Player Bio (optional)" : role === "coach" ? "Coach Bio (optional)" : "Bio (optional)"} value={form.bio} onChangeText={(value) => update("bio", value.slice(0, 250))} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{role === "guardian" ? "Player sports played (required)" : role === "coach" ? "Sports coached (required)" : "Sports played (required)"}</Text>
                <SportPicker selectedSports={selectedSports} onToggle={toggleSport} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Default Sport (required)</Text>
                <SportPicker selectedSports={defaultSport ? [defaultSport] : []} onToggle={(sport) => selectedSports.includes(sport) && setDefaultSport(sport)} sports={selectedSports} single />
              </>
            )}

            <View style={styles.avatarPreviewRow}>
              <Image source={getDefaultAvatar(role, form.gender)} style={styles.avatarPreviewImg} contentFit="cover" />
              <View style={styles.avatarPreviewInfo}>
                <Text style={[styles.avatarPreviewLabel, { color: colors.foreground }]}>Your default profile picture</Text>
                <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>This default picture is shown until your own photo is approved by an admin.</Text>
              </View>
            </View>
            <PrimaryButton label={profileImageId ? "Profile pic submitted for approval" : "Add profile pic for admin approval"} icon="image" onPress={pickImage} />
            <Input label="Instagram link (optional)" value={form.instagram} onChangeText={(value) => update("instagram", value)} />
            <Input label="Facebook link (optional)" value={form.facebook} onChangeText={(value) => update("facebook", value)} />
            <Input label="X link (optional)" value={form.x} onChangeText={(value) => update("x", value)} />
            <Input label="TikTok link (optional)" value={form.tiktok} onChangeText={(value) => update("tiktok", value)} />
            {!isClub ? <Input label="Highlight Reel (YouTube & Vimeo links only, optional, admin approved)" value={form.highlightReelUrl} onChangeText={(value) => update("highlightReelUrl", value)} /> : null}
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Profile Pics and links are admin approved. Any inappropriate pics or links shared will result in the account being removed and banned from the application.</Text>
            <CheckRow active={Boolean(form.agreed)} label={isClub ? "All the Club information I have provided is true and accurate. If a club account is found to be false or misleading, it will be shut down immediately." : role === "guardian" ? "All the player information I have provided is true and accurate. If a Parent/Guardian's Player account is found to be false or misleading, it will be shut down immediately." : "All the player information I have provided is true and accurate. If a player account is found to be false or misleading, it will be shut down immediately."} onPress={() => update("agreed", !form.agreed)} />
            <PrimaryButton label="Create account" icon="user-check" onPress={submit} disabled={!requiredDetailsValid || !socialLinksValid || (isClub && !form.agreed)} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );

  function SportPicker({ selectedSports: selected, onToggle, single, sports }: { selectedSports: string[]; onToggle: (sport: string) => void; single?: boolean; sports?: string[] }) {
    const list = sports?.length ? sports : approvedSports.map((sport) => sport.name);
    return (
      <View style={styles.wrapRow}>
        {list.map((sport) => (
          <Choice key={sport} label={sport} active={selected.includes(sport)} onPress={() => onToggle(sport)} />
        ))}
        {single && list.length === 0 ? <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Choose at least one sport first.</Text> : null}
      </View>
    );
  }

  function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, { backgroundColor: active ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
        <Text style={[styles.choiceText, { color: active ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
      </Pressable>
    );
  }
}

function Input({ label, value, onChangeText, keyboardType, multiline, maxLength, secureTextEntry }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad"; multiline?: boolean; maxLength?: number; secureTextEntry?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} maxLength={maxLength} multiline={multiline} secureTextEntry={secureTextEntry} placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }, multiline ? styles.multiline : null]} />
    </View>
  );
}

function CheckRow({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const colors = useColors();
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
  logo: { width: 118, height: 118, borderRadius: 28 },
  brandTitle: { fontWeight: "800", fontSize: 28, textAlign: "center", letterSpacing: -0.7 },
  brandText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  card: { borderWidth: 1, borderRadius: 30, padding: 18, gap: 14 },
  cardTitle: { fontWeight: "800", fontSize: 23, letterSpacing: -0.4 },
  roleCard: { borderRadius: 22, padding: 16, gap: 4 },
  roleTitle: { fontWeight: "800", fontSize: 15, lineHeight: 20 },
  roleText: { fontWeight: "500", fontSize: 13, lineHeight: 18 },
  inputWrap: { gap: 7 },
  label: { fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 16, minHeight: 48, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  choiceText: { fontWeight: "800", fontSize: 12 },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkBox: { width: 22, height: 22, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkText: { flex: 1, fontWeight: "600", fontSize: 13, lineHeight: 19 },
  smallPrint: { fontWeight: "500", fontSize: 12, lineHeight: 18 },
  dobButton: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  dobValue: { fontWeight: "600", fontSize: 15 },
  dateRow: { gap: 8 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderWidth: 1, borderRadius: 28, padding: 22, gap: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
  adminLink: { alignItems: "center", paddingVertical: 4 },
  adminLinkText: { fontWeight: "600", fontSize: 12, textDecorationLine: "underline" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  backBtnText: { fontWeight: "700", fontSize: 13 },
  passwordWrap: { gap: 10 },
  passwordRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  passwordFlex: { flex: 1 },
  eyeBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 0 },
  errorText: { fontWeight: "600", fontSize: 12 },
  avatarPreviewRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarPreviewImg: { width: 72, height: 72, borderRadius: 36 },
  avatarPreviewInfo: { flex: 1, gap: 4 },
  avatarPreviewLabel: { fontWeight: "700", fontSize: 14 },
});