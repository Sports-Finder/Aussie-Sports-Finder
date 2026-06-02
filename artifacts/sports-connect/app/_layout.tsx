import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkLoading, ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Alert, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure API client base URL (side effect)
import "@/lib/api-client";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AccountSetupGate } from "@/components/AccountSetupGate";
import { OnboardingGate } from "@/components/OnboardingGate";
import { SportsConnectProvider, useSportsConnect } from "@/context/SportsConnectContext";
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const BANNED_EMAIL_MSG = "Your account has been banned by an administrator and access has been revoked.";

function AppContent() {
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  const { user } = useUser();
  const { currentAccount, isHydrated, bannedEmails, autoRestoreSession } = useSportsConnect();

  // Keep a ref to the latest getToken to avoid stale closures across renders,
  // hot-reloads, and sign-in state transitions. Updating a ref during render
  // is safe — React explicitly allows it for this pattern.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    // Register once on mount; always calls the freshest getToken via ref.
    setAuthTokenGetter(() => getTokenRef.current());
    // No cleanup: leave the getter active so it remains valid even when
    // TabLayout layers its own getter on top (both point to the singleton).
  }, []);

  // Returning user: Clerk is authenticated but currentAccount was cleared by signOut.
  // Search the accounts list by email and restore the session without showing setup form.
  useEffect(() => {
    if (!isSignedIn || !isHydrated || currentAccount || !user) return;
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
    if (!email) return;
    const externalAccount = user.externalAccounts?.[0];
    const authMethod = externalAccount?.provider === "google" ? "google"
      : externalAccount?.provider === "apple" ? "apple"
      : "email";
    const socialId = externalAccount?.providerUserId ?? undefined;
    autoRestoreSession(email, authMethod, socialId);
  }, [isSignedIn, isHydrated, currentAccount, user, autoRestoreSession]);

  // Detect returning users whose email was banned after account creation
  useEffect(() => {
    if (!isSignedIn || !isHydrated || !currentAccount) return;
    const email = currentAccount.email.toLowerCase();
    if (bannedEmails.map((e) => e.toLowerCase()).includes(email)) {
      Alert.alert(
        "Account blocked",
        BANNED_EMAIL_MSG,
        [{ text: "OK", onPress: () => { void signOut(); } }],
      );
    }
  }, [isSignedIn, isHydrated, currentAccount, bannedEmails, signOut]);

  if (!isLoaded || !isHydrated) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.light.pitch }]}>
        <ActivityIndicator color={colors.light.accent} size="large" />
        <Text style={[styles.loadingText, { color: colors.light.primaryForeground }]}>
          Loading…
        </Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <OnboardingGate />;
  }

  if (!currentAccount) {
    return <AccountSetupGate />;
  }

  return <RootLayoutNav />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
        <ClerkLoading>
          <View style={[styles.loadingScreen, { backgroundColor: colors.light.pitch }]}>
            <ActivityIndicator color={colors.light.accent} size="large" />
          </View>
        </ClerkLoading>
        <ClerkLoaded>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <SportsConnectProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <AppContent />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SportsConnectProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    paddingHorizontal: 28,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
