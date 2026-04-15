import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/SportsUI";
import { AccountRole, AuthMethod, SocialLinks, useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

const logo = require("@/assets/images/icon.png");
const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const genders = ["Male", "Female", "Pref Not to Say"];

type Step = "auth" | "verify" | "type" | "details";

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
  const parts = dateOfBirth.split("-");
  if (parts.length !== 3) return new Date("");
  const [day, month, year] = parts.map((value) => Number(value));
  if (!day || !month || !year) return new Date("");
  return new Date(year, month - 1, day);
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
  const { currentAccount, approvedSports, createAccount, pickAccountImage } = useSportsConnect();
  const [step, setStep] = useState<Step>("auth");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
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
    location: "",
    mobile: "",
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
    return Boolean(nameValid && form.gender && form.dateOfBirth && guardianAgeValid && playerAgeValid && isAustralianLocation(form.location) && form.mobile.trim() && selectedSports.length && defaultSport);
  }, [age, defaultSport, form, humanChecked, isClub, primaryEmail, role, selectedSports.length]);

  if (currentAccount) return <>{children}</>;

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

  const verifyEmail = () => {
    if (!email.includes("@")) {
      Alert.alert("Email required", "Enter a valid email address before continuing.");
      return;
    }
    if (!humanChecked) {
      Alert.alert("Bot check required", "Confirm the bot detection checkbox before continuing.");
      return;
    }
    if (verificationCode.trim().length < 6) {
      Alert.alert("Verification required", "Enter the 6 digit email verification code.");
      return;
    }
    setStep("type");
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
      location: isClub ? form.clubAddress : form.location,
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
            <PrimaryButton label="Sign up with Email" icon="at-sign" onPress={() => beginAuth("email")} />
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Email sign ups include verification and bot detection before account setup.</Text>
          </View>
        ) : null}

        {step === "verify" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Verify your email</Text>
            <Input label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Input label="6 digit verification code" value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" />
            <CheckRow active={humanChecked} label="I am not a robot" onPress={() => setHumanChecked(!humanChecked)} />
            <PrimaryButton label="Continue to account setup" icon="check-circle" onPress={verifyEmail} />
          </View>
        ) : null}

        {step === "type" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                        <TextInput value={draftDob} onChangeText={setDraftDob} placeholder="DD-MM-YYYY" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
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
                <Input label="Suburb/City & State (Australia only) (required)" value={form.location} onChangeText={(value) => update("location", value)} />
                <Input label={role === "guardian" ? "Parent/Guardian Email Address (required)" : "Email Address (required)"} value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Input label={role === "guardian" ? "Parent/Guardian Mobile Number (required)" : "Mobile Number (required)"} value={form.mobile} onChangeText={(value) => update("mobile", value)} keyboardType="phone-pad" />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{role === "guardian" ? "Player sports played (required)" : role === "coach" ? "Sports coached (required)" : "Sports played (required)"}</Text>
                <SportPicker selectedSports={selectedSports} onToggle={toggleSport} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Default Sport (required)</Text>
                <SportPicker selectedSports={defaultSport ? [defaultSport] : []} onToggle={(sport) => selectedSports.includes(sport) && setDefaultSport(sport)} sports={selectedSports} single />
              </>
            )}

            <PrimaryButton label={profileImageId ? "Profile pic submitted for approval" : "Add profile pic for admin approval"} icon="image" onPress={pickImage} />
            <Input label="Instagram link (optional)" value={form.instagram} onChangeText={(value) => update("instagram", value)} />
            <Input label="Facebook link (optional)" value={form.facebook} onChangeText={(value) => update("facebook", value)} />
            <Input label="X link (optional)" value={form.x} onChangeText={(value) => update("x", value)} />
            <Input label="TikTok link (optional)" value={form.tiktok} onChangeText={(value) => update("tiktok", value)} />
            {!isClub ? <Input label="Highlights Reel link (optional, admin approved)" value={form.highlightReelUrl} onChangeText={(value) => update("highlightReelUrl", value)} /> : null}
            <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>Profile Pics and links are admin approved. Any inappropriate pics or links shared will result in the account being removed and banned from the application.</Text>
            <CheckRow active={Boolean(form.agreed)} label={isClub ? "All the Club information I have provided is true and accurate. If a club account is found to be false or misleading, it will be shut down immediately." : role === "guardian" ? "All the player information I have provided is true and accurate. If a Parent/Guardian's Player account is found to be false or misleading, it will be shut down immediately." : "All the player information I have provided is true and accurate. If a player account is found to be false or misleading, it will be shut down immediately."} onPress={() => update("agreed", !form.agreed)} />
    <PrimaryButton label="Create account" icon="user-check" onPress={submit} disabled={!requiredDetailsValid || !socialLinksValid} />
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

function Input({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad" }) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
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
});