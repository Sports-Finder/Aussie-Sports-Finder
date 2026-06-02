import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure API client base URL and auth token getter (side effects)
import "@/lib/api-client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SportsConnectProvider } from "@/context/SportsConnectContext";
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

function LaunchScreen() {
  const theme = colors.light;

  return (
    <View style={[styles.launchScreen, { backgroundColor: theme.pitch }]}>
      <View style={[styles.logoFrame, { backgroundColor: theme.card }]}>
        <Image
          source={require("@/assets/images/icon.png")}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>
      <ActivityIndicator color={theme.accent} size="large" />
      <Text style={[styles.launchText, { color: theme.primaryForeground }]}>
        Loading Aussie Sports Club Finder
      </Text>
    </View>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.launchScreen, { backgroundColor: colors.light.pitch }]}>
        <ActivityIndicator color={colors.light.accent} size="large" />
        <Text style={[styles.launchText, { color: colors.light.primaryForeground }]}>
          Checking your session…
        </Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <OnboardingGate />;
  }

  return <RootLayoutNav />;
}

export default function RootLayout() {
  const [showLaunch, setShowLaunch] = useState(true);
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

  useEffect(() => {
    const timer = setTimeout(() => setShowLaunch(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (showLaunch) {
    return <LaunchScreen />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SportsConnectProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AppContent />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SportsConnectProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  launchScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    paddingHorizontal: 28,
  },
  logoFrame: {
    width: 220,
    height: 220,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  launchText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
