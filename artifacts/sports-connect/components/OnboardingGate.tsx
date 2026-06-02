import * as AuthSession from "expo-auth-session";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSignIn, useSignUp, useSSO } from "@clerk/expo";

import { AdminPage, ModeratorPage } from "@/components/AdminDashboard";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

const BANNED_EMAIL_MSG = "This email address has been banned by an administrator and cannot be used with this app.";

const logo = require("@/assets/images/icon.png") as number;

// Required for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

type AuthMode = "signin" | "signup";

// ---------------------------------------------------------------------------
// OAuthButtons — isolated in its own component so that useSSO() (which
// internally calls legacy useSignIn + useSignUp from @clerk/react/legacy) does
// NOT share a hook-call stack with OnboardingGate's v3 useSignIn/useSignUp.
// Mixing the two Clerk generations in one component causes a variable hook
// count during Clerk initialisation, triggering "Rendered fewer hooks than
// expected" in the parent.
// ---------------------------------------------------------------------------
type OAuthButtonsProps = {
  bannedEmails: string[];
  colors: ReturnType<typeof useColors>;
};

function OAuthButtons({ bannedEmails, colors }: OAuthButtonsProps) {
  const { startSSOFlow } = useSSO();

  const handleOAuth = useCallback(async (strategy: "oauth_google" | "oauth_apple") => {
    try {
      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (!createdSessionId || !setActive) return;
      const oauthEmail =
        (signIn?.identifier ?? signUp?.emailAddress ?? "").toLowerCase().trim();
      if (oauthEmail && bannedEmails.map((e) => e.toLowerCase()).includes(oauthEmail)) {
        Alert.alert("Account blocked", BANNED_EMAIL_MSG);
        return;
      }
      await setActive({ session: createdSessionId, navigate: () => {} });
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  }, [startSSOFlow, bannedEmails]);

  return (
    <>
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.oauthBtn,
          { backgroundColor: colors.secondary, borderColor: colors.border },
          pressed && styles.btnDisabled,
        ]}
        onPress={() => handleOAuth("oauth_google")}
      >
        <Text style={[styles.oauthBtnText, { color: colors.secondaryForeground }]}>
          Continue with Google
        </Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable
          style={({ pressed }) => [
            styles.oauthBtn,
            { backgroundColor: "#000", borderColor: colors.border },
            pressed && styles.btnDisabled,
          ]}
          onPress={() => handleOAuth("oauth_apple")}
        >
          <Text style={[styles.oauthBtnText, { color: "#fff" }]}>
            Continue with Apple
          </Text>
        </Pressable>
      )}
    </>
  );
}

export function OnboardingGate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    isAdmin,
    isModerator,
    adminLogin,
    adminSignOut,
    moderatorLogin,
    moderatorSignOut,
    bannedEmails,
  } = useSportsConnect();

  const { signIn, errors: siErrors, fetchStatus: siFetching } = useSignIn();
  const { signUp, errors: suErrors, fetchStatus: suFetching } = useSignUp();

  useWarmUpBrowser();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [bannedEmailError, setBannedEmailError] = useState(false);

  // Admin/moderator bypass — passcode-based, independent of Clerk auth
  if (isAdmin) return <AdminPage onExit={() => adminSignOut()} />;
  if (isModerator) return <ModeratorPage onExit={() => moderatorSignOut()} />;

  const needsMFAVerify = signIn.status === "needs_client_trust";
  const needsEmailVerify =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSignIn = async () => {
    const normalized = email.toLowerCase().trim();
    if (bannedEmails.map((e) => e.toLowerCase()).includes(normalized)) {
      setBannedEmailError(true);
      return;
    }
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => {} });
    }
  };

  const handleVerifyMFA = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => {} });
    }
  };

  const handleSignUp = async () => {
    const normalized = email.toLowerCase().trim();
    if (bannedEmails.map((e) => e.toLowerCase()).includes(normalized)) {
      setBannedEmailError(true);
      return;
    }
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerifyEmail = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({ navigate: () => {} });
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setCode("");
    setEmail("");
    setPassword("");
    setBannedEmailError(false);
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
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>
            Aussie Sports Club Finder
          </Text>
          <Text style={[styles.brandText, { color: colors.mutedForeground }]}>
            Australia's Player, Coach & Club Portal — all sports, all ages, all regions.
          </Text>
        </View>

        {/* Mode tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Pressable
            style={[styles.tab, mode === "signin" && { backgroundColor: colors.primary }]}
            onPress={() => switchMode("signin")}
          >
            <Text
              style={[
                styles.tabText,
                { color: mode === "signin" ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              Sign in
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === "signup" && { backgroundColor: colors.primary }]}
            onPress={() => switchMode("signup")}
          >
            <Text
              style={[
                styles.tabText,
                { color: mode === "signup" ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              Sign up
            </Text>
          </Pressable>
        </View>

        {/* Auth card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* ── Sign in ── */}
          {mode === "signin" && !needsMFAVerify && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={email}
                onChangeText={(v) => { setEmail(v); setBannedEmailError(false); }}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {bannedEmailError ? (
                <Text style={styles.error}>{BANNED_EMAIL_MSG}</Text>
              ) : siErrors.fields.identifier ? (
                <Text style={styles.error}>{siErrors.fields.identifier.message}</Text>
              ) : null}

              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                autoComplete="password"
              />
              {siErrors.fields.password ? (
                <Text style={styles.error}>{siErrors.fields.password.message}</Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                  (!email || !password || siFetching === "fetching" || pressed) && styles.btnDisabled,
                ]}
                onPress={handleSignIn}
                disabled={!email || !password || siFetching === "fetching"}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Sign in
                </Text>
              </Pressable>

              <OAuthButtons bannedEmails={bannedEmails} colors={colors} />
            </>
          )}

          {/* ── Sign in MFA verify ── */}
          {mode === "signin" && needsMFAVerify && (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Check your email</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                We sent a verification code to your email.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                autoComplete="one-time-code"
              />
              {siErrors.fields.code ? (
                <Text style={styles.error}>{siErrors.fields.code.message}</Text>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                  (!code || siFetching === "fetching" || pressed) && styles.btnDisabled,
                ]}
                onPress={handleVerifyMFA}
                disabled={!code || siFetching === "fetching"}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Verify
                </Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => signIn.mfa.sendEmailCode()}>
                <Text style={[styles.linkBtnText, { color: colors.primary }]}>Resend code</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => signIn.reset()}>
                <Text style={[styles.linkBtnText, { color: colors.mutedForeground }]}>Start over</Text>
              </Pressable>
            </>
          )}

          {/* ── Sign up ── */}
          {mode === "signup" && !needsEmailVerify && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={email}
                onChangeText={(v) => { setEmail(v); setBannedEmailError(false); }}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {bannedEmailError ? (
                <Text style={styles.error}>{BANNED_EMAIL_MSG}</Text>
              ) : suErrors.fields.emailAddress ? (
                <Text style={styles.error}>{suErrors.fields.emailAddress.message}</Text>
              ) : null}

              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                autoComplete="new-password"
              />
              {suErrors.fields.password ? (
                <Text style={styles.error}>{suErrors.fields.password.message}</Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                  (!email || !password || suFetching === "fetching" || pressed) && styles.btnDisabled,
                ]}
                onPress={handleSignUp}
                disabled={!email || !password || suFetching === "fetching"}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Create account
                </Text>
              </Pressable>

              <OAuthButtons bannedEmails={bannedEmails} colors={colors} />

              {/* Required for bot protection */}
              <View nativeID="clerk-captcha" />
            </>
          )}

          {/* ── Sign up email verify ── */}
          {mode === "signup" && needsEmailVerify && (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Verify your email</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to {email}. Enter it below to complete sign-up.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                autoComplete="one-time-code"
              />
              {suErrors.fields.code ? (
                <Text style={styles.error}>{suErrors.fields.code.message}</Text>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                  (!code || suFetching === "fetching" || pressed) && styles.btnDisabled,
                ]}
                onPress={handleVerifyEmail}
                disabled={!code || suFetching === "fetching"}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Verify email
                </Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => signUp.verifications.sendEmailCode()}>
                <Text style={[styles.linkBtnText, { color: colors.primary }]}>Resend code</Text>
              </Pressable>
            </>
          )}

          {/* Admin access link */}
          <Pressable
            onPress={() => {
              setAdminPasscodeInput("");
              setShowAdminModal(true);
            }}
            style={styles.adminLink}
          >
            <Text style={[styles.adminLinkText, { color: colors.mutedForeground }]}>
              Admin access
            </Text>
          </Pressable>
        </View>

        {/* Admin passcode modal */}
        <Modal
          transparent
          visible={showAdminModal}
          animationType="fade"
          onRequestClose={() => setShowAdminModal(false)}
        >
          <View style={styles.modalScrim}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Admin login</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                Enter your admin passcode to access moderation tools.
              </Text>
              <TextInput
                value={adminPasscodeInput}
                onChangeText={setAdminPasscodeInput}
                placeholder="Admin passcode"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShowAdminModal(false)}
                  style={({ pressed }) => [
                    styles.modalButton,
                    { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const adminOk = adminLogin(adminPasscodeInput);
                    if (adminOk) { setShowAdminModal(false); return; }
                    const modOk = moderatorLogin(adminPasscodeInput);
                    if (modOk) { setShowAdminModal(false); return; }
                    Alert.alert("Incorrect passcode", "The passcode you entered is incorrect. Please try again.");
                  }}
                  style={({ pressed }) => [
                    styles.modalButton,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>
                    Login
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  brand: { alignItems: "center", gap: 10 },
  logo: { width: 236, height: 236, borderRadius: 56 },
  brandTitle: { fontWeight: "800", fontSize: 28, textAlign: "center", letterSpacing: -0.7 },
  brandText: { fontWeight: "500", fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  tabs: { flexDirection: "row", borderRadius: 20, borderWidth: 1, padding: 4, gap: 4 },
  tab: { flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: "center" },
  tabText: { fontWeight: "700", fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 30, padding: 18, gap: 14 },
  cardTitle: { fontWeight: "800", fontSize: 23, letterSpacing: -0.4 },
  smallPrint: { fontWeight: "500", fontSize: 12, lineHeight: 18 },
  label: { fontWeight: "600", fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 16, minHeight: 48, paddingHorizontal: 14, fontWeight: "600", fontSize: 15 },
  primaryBtn: { minHeight: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.65 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontWeight: "600", fontSize: 13 },
  oauthBtn: { minHeight: 50, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  oauthBtnText: { fontWeight: "700", fontSize: 15 },
  linkBtn: { alignItems: "center", paddingVertical: 2 },
  linkBtnText: { fontWeight: "600", fontSize: 13, textDecorationLine: "underline" },
  error: { color: "#EF4444", fontWeight: "600", fontSize: 12 },
  adminLink: { alignItems: "center", paddingVertical: 4 },
  adminLinkText: { fontWeight: "600", fontSize: 12, textDecorationLine: "underline" },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderWidth: 1, borderRadius: 28, padding: 22, gap: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
});
