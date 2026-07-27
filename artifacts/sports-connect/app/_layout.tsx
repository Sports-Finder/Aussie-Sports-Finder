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
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Alert, ActivityIndicator, LogBox, StyleSheet, Text, View } from "react-native";
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
import { router } from "expo-router";
import {
  initializeRevenueCat,
  identifyRevenueCatUser,
  SubscriptionProvider,
  useSubscription,
} from "@/lib/revenuecat";
import colors from "@/constants/colors";

// @expo/vector-icons v15 + Expo SDK 54 + New Architecture bundles all icon fonts
// natively into the iOS binary. iOS then rejects the JS-side registration attempt
// with CTFontManagerError code 104 ("already registered") — the font IS available
// and all icons render correctly. This suppresses the misleading console noise.
LogBox.ignoreLogs([/Registering '.*' font failed.*CTFontManagerError/]);

// Configure how local notifications are presented when received in the foreground.
// Must be called before any notification is scheduled or received.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Initialize RevenueCat SDK at module load time (before any React trees mount).
// Track whether configure() succeeded so SubscriptionSync doesn't mark the
// SDK as ready when it actually failed (which would trigger queries against
// an unconfigured SDK and produce unhelpful errors).
let _rcInitOk = false;
try {
  initializeRevenueCat();
  _rcInitOk = true;
} catch (err) {
  console.warn("RevenueCat init failed:", err);
}

// Syncs RevenueCat subscription status into the local account store so
// subscriptionStatus is always current (drives gold star badge in Discover).
function SubscriptionSync() {
  const { currentAccount, updateAccount } = useSportsConnect();
  const { customerInfo, isLoading, markInitialized } = useSubscription();

  // Only signal "ready" to the RC context if configure() actually succeeded.
  useEffect(() => {
    if (_rcInitOk) markInitialized();
  // markInitialized is stable (ref-based), run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Propagate subscription status to account store whenever RC confirms it,
  // or when the admin toggles promotionalPremium. Both sources drive the
  // subscriptionStatus field so every part of the app (gold star, BUMP,
  // repost cooldown) reflects the correct state without reading RC directly.
  useEffect(() => {
    if (!currentAccount || isLoading) return;
    const rcActive = customerInfo?.entitlements.active?.["premium"] !== undefined;
    const nextStatus = rcActive || !!currentAccount.promotionalPremium ? "active" : "inactive";
    if (currentAccount.subscriptionStatus !== nextStatus) {
      updateAccount({ subscriptionStatus: nextStatus });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerInfo, isLoading, currentAccount?.id, currentAccount?.promotionalPremium]);

  return null;
}

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

// Registers the Clerk auth token getter synchronously during render — BEFORE
// SportsConnectProvider mounts — so that its initial loadFromApi effect sends
// authenticated requests instead of getting 401s.
//
// React renders parent components before children, so calling setAuthTokenGetter
// here (during render, not in a useEffect) guarantees the module-level
// _authTokenGetter is set by the time SportsConnectProvider's useEffect fires.
function AuthTokenRegistrar({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Synchronous side-effect during render: safe because it's idempotent, writes
  // only a module-level function pointer, and does not affect reconciliation.
  setAuthTokenGetter(async () => {
    const token = await getTokenRef.current();
    if (token) return token;
    // If Clerk's JWT isn't cached yet (first render after sign-in), wait briefly
    // and retry with a forced cache-bust.
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    return getTokenRef.current({ skipCache: true });
  });

  return <>{children}</>;
}

const BANNED_EMAIL_MSG = "Your account has been banned by an administrator and access has been revoked.";

// Listens for notification taps and routes admin/moderator to the Chats section.
// Must live inside SportsConnectProvider so it can call setAdminNavConversationId.
function NotificationDeepLink() {
  const { setAdminNavConversationId } = useSportsConnect();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const conversationId = typeof data?.conversationId === "string" ? data.conversationId : null;
      if (conversationId) {
        setAdminNavConversationId(conversationId);
        // Navigate to profile tab so the admin/moderator dashboard is visible.
        router.push("/(tabs)/profile");
      }
    });
    return () => sub.remove();
  // setAdminNavConversationId is stable (referentially stable from context).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function AppContent() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const { currentAccount, isHydrated, accounts, bannedEmails, signOut: localSignOut, restoreAccountByClerkId } = useSportsConnect();

  // Identify the RevenueCat user with the stable Clerk user ID so entitlements
  // are never fragmented across anonymous / local account identities.
  useEffect(() => {
    if (user?.id) {
      identifyRevenueCatUser(user.id);
    }
  }, [user?.id]);

  // When Clerk finishes signing out, clear the local account so stale data
  // doesn't linger. This is the authoritative place to call localSignOut —
  // calling it in the UI simultaneously with clerkSignOut() causes a race
  // where autoRestoreSession fires while isSignedIn is still true and
  // re-populates currentAccount with the old user before Clerk is done.
  useEffect(() => {
    if (isHydrated && !isSignedIn) {
      localSignOut();
    }
  // localSignOut is stable (referentially stable from useSportsConnect).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isHydrated]);

  // Auto-restore currentAccount on app restart. After hydration, if Clerk is
  // already signed in but no account has been matched yet, find the account
  // by Clerk user ID (authoritative) or email (fallback) and restore it
  // silently so the user never sees AccountSetupGate on relaunch.
  //
  // accounts.length is included as a dependency so that if isHydrated fires
  // while accounts is still empty (API failed / slow start), the effect
  // automatically retries once accounts are populated — preventing a network
  // hiccup from locking a returning user out with AccountSetupGate.
  useEffect(() => {
    if (!isHydrated || !isSignedIn || currentAccount || !user) return;
    if (accounts.length === 0) return; // accounts not yet loaded — wait for retry
    const email = user.emailAddresses[0]?.emailAddress;
    restoreAccountByClerkId(user.id, email);
  // restoreAccountByClerkId is stable. Run whenever hydration, sign-in state,
  // or accounts population changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isSignedIn, currentAccount, user?.id, accounts.length]);

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
              <AuthTokenRegistrar>
              <SportsConnectProvider>
                <SubscriptionProvider>
                  <SubscriptionSync />
                  <NotificationDeepLink />
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <AppContent />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </SubscriptionProvider>
              </SportsConnectProvider>
              </AuthTokenRegistrar>
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
