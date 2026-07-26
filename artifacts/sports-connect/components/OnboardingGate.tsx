import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";

function lighten(hex: string, amount: number = 0.15): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round((255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round((255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, (num & 0xff) + Math.round((255 - (num & 0xff)) * amount));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { G, Path } from "react-native-svg";
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

type AuthMode = "signin" | "signup" | "forgot" | "reset";

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

      <Pressable onPress={() => handleOAuth("oauth_google")} style={({ pressed }) => [styles.googleBtn, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={styles.googleBtnInner}>
          {/* Official Google "G" logo */}
          <Svg width={20} height={20} viewBox="0 0 48 48">
            <G>
              <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              <Path fill="none" d="M0 0h48v48H0z" />
            </G>
          </Svg>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </View>
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable onPress={() => handleOAuth("oauth_apple")} style={({ pressed }) => [styles.oauthBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <LinearGradient colors={["#000000", lighten("#000000", 0.2)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.oauthBtn}>
            <Text style={[styles.oauthBtnText, { color: "#fff" }]}>Continue with Apple</Text>
          </LinearGradient>
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [bannedEmailError, setBannedEmailError] = useState(false);
  const [existingAccountRole, setExistingAccountRole] = useState<string | null | undefined>(undefined);
  const [showSignInPwd, setShowSignInPwd] = useState(false);
  const [showSignUpPwd, setShowSignUpPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showResetConfirmPwd, setShowResetConfirmPwd] = useState(false);

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
    setExistingAccountRole(undefined);
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) {
      // If the email is already taken, look up what kind of account exists
      // so we can show a helpful "sign in instead" message.
      const emailErr = suErrors.fields.emailAddress;
      const isTaken = emailErr && (
        emailErr.code === "form_identifier_exists" ||
        emailErr.message?.toLowerCase().includes("taken") ||
        emailErr.message?.toLowerCase().includes("already")
      );
      if (isTaken) {
        try {
          const domain = process.env.EXPO_PUBLIC_DOMAIN;
          const base = domain ? `https://${domain}` : "";
          const resp = await fetch(`${base}/api/accounts/lookup-role?email=${encodeURIComponent(normalized)}`);
          const data = await resp.json() as { role?: string | null };
          setExistingAccountRole(data.role ?? null);
        } catch {
          setExistingAccountRole(null);
        }
      }
      return;
    }
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
    if (next !== "forgot") setEmail("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMismatch(false);
    setBannedEmailError(false);
    setExistingAccountRole(undefined);
  };

  const roleLabel = (role: string | null | undefined): string => {
    if (!role) return "an";
    const map: Record<string, string> = { player: "a Player", coach: "a Coach", club: "a Club", academy: "an Academy" };
    return map[role] ?? "an";
  };

  const handleForgotPassword = async () => {
    const { error: createErr } = await signIn.create({ identifier: email });
    if (createErr) return;
    const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendErr) return;
    setMode("reset");
  };

  const handleResendResetCode = async () => {
    await signIn.resetPasswordEmailCode.sendCode();
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    const { error: verifyErr } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verifyErr) return;
    const { error: submitErr } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
    if (submitErr) return;
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => {} });
    }
  };

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
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>
            Aussie Sports Club Finder
          </Text>
          <Text style={[styles.brandText, { color: colors.mutedForeground }]}>
            Australia's Player, Coach & Club Portal — all sports, all ages, all regions.
          </Text>
        </View>

        {/* Mode tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.secondary, borderColor: colors.foreground, borderWidth: 2 }]}>
          <Pressable
            style={[styles.tab, (mode === "signin" || mode === "forgot" || mode === "reset") && { backgroundColor: colors.primary }]}
            onPress={() => switchMode("signin")}
          >
            <Text
              style={[
                styles.tabText,
                { color: (mode === "signin" || mode === "forgot" || mode === "reset") ? colors.primaryForeground : colors.mutedForeground },
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
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>

          {/* ── Sign in ── */}
          {mode === "signin" && !needsMFAVerify && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
              <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 0, paddingRight: 8 }]}>
                <TextInput
                  style={{ flex: 1, color: colors.foreground, fontWeight: "600", fontSize: 15, paddingHorizontal: 14, minHeight: 48 }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showSignInPwd}
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowSignInPwd((p) => !p)} style={{ padding: 6, marginRight: 4 }}>
                  <Feather name={showSignInPwd ? "eye-off" : "eye"} size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {siErrors.fields.password ? (
                <Text style={styles.error}>{siErrors.fields.password.message}</Text>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={!email || !password || siFetching === "fetching"}
                style={({ pressed }) => [styles.primaryBtn, { opacity: (!email || !password || siFetching === "fetching" || pressed) ? 0.65 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, lighten(colors.primary)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign in</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.linkBtn} onPress={() => switchMode("forgot")}>
                <Text style={[styles.linkBtnText, { color: colors.mutedForeground }]}>
                  Forgot password?
                </Text>
              </Pressable>

              <OAuthButtons bannedEmails={bannedEmails} colors={colors} />
            </>
          )}

          {/* ── Forgot password ── */}
          {mode === "forgot" && (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Reset your password</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                Enter your email address and we'll send you a code to reset your password.
              </Text>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
                value={email}
                onChangeText={(v) => { setEmail(v); setBannedEmailError(false); }}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {siErrors.fields.identifier ? (
                <Text style={styles.error}>{siErrors.fields.identifier.message}</Text>
              ) : null}
              <Pressable
                onPress={handleForgotPassword}
                disabled={!email || siFetching === "fetching"}
                style={({ pressed }) => [styles.primaryBtn, { opacity: (!email || siFetching === "fetching" || pressed) ? 0.65 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, lighten(colors.primary)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Send reset code</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => switchMode("signin")}>
                <Text style={[styles.linkBtnText, { color: colors.mutedForeground }]}>Back to sign in</Text>
              </Pressable>
            </>
          )}

          {/* ── Reset password (enter code + new password) ── */}
          {mode === "reset" && (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose a new password</Text>
              <Text style={[styles.smallPrint, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to {email}. Enter it along with your new password below.
              </Text>
              <Text style={[styles.label, { color: colors.foreground }]}>Reset code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
              <Text style={[styles.label, { color: colors.foreground }]}>New password</Text>
              <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 0, paddingRight: 8 }]}>
                <TextInput
                  style={{ flex: 1, color: colors.foreground, fontWeight: "600", fontSize: 15, paddingHorizontal: 14, minHeight: 48 }}
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setPasswordMismatch(false); }}
                  placeholder="New password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showNewPwd}
                  autoComplete="new-password"
                />
                <Pressable onPress={() => setShowNewPwd((p) => !p)} style={{ padding: 6, marginRight: 4 }}>
                  <Feather name={showNewPwd ? "eye-off" : "eye"} size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {siErrors.fields.password ? (
                <Text style={styles.error}>{siErrors.fields.password.message}</Text>
              ) : null}
              <Text style={[styles.label, { color: colors.foreground }]}>Confirm new password</Text>
              <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 0, paddingRight: 8 }]}>
                <TextInput
                  style={{ flex: 1, color: colors.foreground, fontWeight: "600", fontSize: 15, paddingHorizontal: 14, minHeight: 48 }}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setPasswordMismatch(false); }}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showResetConfirmPwd}
                  autoComplete="new-password"
                />
                <Pressable onPress={() => setShowResetConfirmPwd((p) => !p)} style={{ padding: 6, marginRight: 4 }}>
                  <Feather name={showResetConfirmPwd ? "eye-off" : "eye"} size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {passwordMismatch ? (
                <Text style={styles.error}>Passwords do not match.</Text>
              ) : null}
              <Pressable
                onPress={handleResetPassword}
                disabled={!code || !newPassword || !confirmPassword || siFetching === "fetching"}
                style={({ pressed }) => [styles.primaryBtn, { opacity: (!code || !newPassword || !confirmPassword || siFetching === "fetching" || pressed) ? 0.65 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, lighten(colors.primary)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Reset password</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={handleResendResetCode}>
                <Text style={[styles.linkBtnText, { color: colors.primary }]}>Resend code</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => switchMode("signin")}>
                <Text style={[styles.linkBtnText, { color: colors.mutedForeground }]}>Back to sign in</Text>
              </Pressable>
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
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
                onPress={handleVerifyMFA}
                disabled={!code || siFetching === "fetching"}
                style={({ pressed }) => [styles.primaryBtn, { opacity: (!code || siFetching === "fetching" || pressed) ? 0.65 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, lighten(colors.primary)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Verify</Text>
                </LinearGradient>
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
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
              ) : existingAccountRole !== undefined && suErrors.fields.emailAddress ? (
                <View style={styles.takenBox}>
                  <Text style={styles.takenMsg}>
                    You already have {roleLabel(existingAccountRole)} account registered under this email address.
                  </Text>
                  <Pressable onPress={() => switchMode("signin")} style={styles.takenBtn}>
                    <Text style={styles.takenBtnText}>Sign in instead</Text>
                  </Pressable>
                </View>
              ) : suErrors.fields.emailAddress ? (
                <Text style={styles.error}>{suErrors.fields.emailAddress.message}</Text>
              ) : null}

              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 0, paddingRight: 8 }]}>
                <TextInput
                  style={{ flex: 1, color: colors.foreground, fontWeight: "600", fontSize: 15, paddingHorizontal: 14, minHeight: 48 }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showSignUpPwd}
                  autoComplete="new-password"
                />
                <Pressable onPress={() => setShowSignUpPwd((p) => !p)} style={{ padding: 6, marginRight: 4 }}>
                  <Feather name={showSignUpPwd ? "eye-off" : "eye"} size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {suErrors.fields.password ? (
                <Text style={styles.error}>{suErrors.fields.password.message}</Text>
              ) : null}

              <Pressable
                onPress={handleSignUp}
                disabled={!email || !password || suFetching === "fetching"}
                style={({ pressed }) => [styles.primaryBtn, { opacity: (!email || !password || suFetching === "fetching" || pressed) ? 0.65 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, lighten(colors.primary)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Create account</Text>
                </LinearGradient>
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
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
                onPress={handleVerifyEmail}
                disabled={!code || suFetching === "fetching"}
                style={({ pressed }) => [styles.primaryBtn, { opacity: (!code || suFetching === "fetching" || pressed) ? 0.65 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, lighten(colors.primary)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Verify email</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => signUp.verifications.sendEmailCode()}>
                <Text style={[styles.linkBtnText, { color: colors.primary }]}>Resend code</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { signUp.reset(); switchMode("signup"); }}>
                <Text style={[styles.linkBtnText, { color: colors.mutedForeground }]}>Use a different email</Text>
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
      </ScrollView>

      {/* Admin passcode modal */}
      <Modal
        transparent
        visible={showAdminModal}
        animationType="fade"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 }]}>
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
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.foreground, borderWidth: 2, color: colors.foreground }]}
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
    </KeyboardAvoidingView>
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
  primaryBtn: { minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden", width: "100%", paddingHorizontal: 40 },
  primaryBtnText: { fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.65 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontWeight: "600", fontSize: 13 },
  oauthBtn: { minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden", width: "100%", paddingHorizontal: 40 },
  oauthBtnText: { fontWeight: "700", fontSize: 15 },
  googleBtn: { width: "100%", borderRadius: 4, borderWidth: 1, borderColor: "#DADCE0", backgroundColor: "#FFFFFF", minHeight: 48, overflow: "hidden" },
  googleBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24, minHeight: 48 },
  googleBtnText: { fontWeight: "600", fontSize: 15, color: "#3C4043" },
  linkBtn: { alignItems: "center", paddingVertical: 2 },
  linkBtnText: { fontWeight: "600", fontSize: 13, textDecorationLine: "underline" },
  error: { color: "#EF4444", fontWeight: "600", fontSize: 12 },
  takenBox: { backgroundColor: "#FEF9C3", borderRadius: 12, padding: 14, gap: 10 },
  takenMsg: { color: "#92400E", fontWeight: "600", fontSize: 13, lineHeight: 19 },
  takenBtn: { backgroundColor: "#D97706", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16, alignSelf: "flex-start" },
  takenBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  adminLink: { alignItems: "center", paddingVertical: 4 },
  adminLinkText: { fontWeight: "600", fontSize: 12, textDecorationLine: "underline" },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderWidth: 1, borderRadius: 28, padding: 22, gap: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalButtonText: { fontWeight: "700", fontSize: 15 },
});
