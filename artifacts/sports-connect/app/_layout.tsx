import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkLoading, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure API client base URL (side effect)
import "@/lib/api-client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingGate } from "@/components/OnboardingGate";
import { SportsConnectProvider } from "@/context/SportsConnectContext";
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

function AppContent() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
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
