import React, { createContext, useContext, useRef, useState } from "react";
import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";

// Module-level flag so SubscriptionProvider knows if configure() has been called
let _initialized = false;

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat Public API Keys not found");
  }
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat(userId?: string) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) throw new Error("RevenueCat Public API Key not found");
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey, appUserID: userId });
  _initialized = true;
  console.log("Configured RevenueCat");
}

export function identifyRevenueCatUser(userId: string) {
  if (!_initialized) return;
  Purchases.logIn(userId).catch((err) => console.warn("RevenueCat logIn failed:", err));
}

function useSubscriptionContext() {
  const qc = useQueryClient();

  // Local ready flag — flipped to true by markInitialized() which is called
  // from _layout.tsx after initializeRevenueCat() succeeds.
  const [ready, setReady] = useState(_initialized);
  const markInitialized = () => {
    _initialized = true;
    setReady(true);
    // Immediately kick off the queries now that the SDK is configured.
    qc.invalidateQueries({ queryKey: ["revenuecat"] });
  };

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    enabled: ready,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
    enabled: ready,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  const currentOffering = offeringsQuery.data?.current ?? null;

  const clubMonthlyPackage = currentOffering?.availablePackages.find(
    (p) => p.identifier === "$rc_monthly_club",
  ) ?? null;
  const clubAnnualPackage = currentOffering?.availablePackages.find(
    (p) => p.identifier === "$rc_annual_club",
  ) ?? null;
  const playerMonthlyPackage = currentOffering?.availablePackages.find(
    (p) => p.identifier === "$rc_monthly",
  ) ?? null;
  const playerAnnualPackage = currentOffering?.availablePackages.find(
    (p) => p.identifier === "$rc_annual",
  ) ?? null;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    currentOffering,
    clubMonthlyPackage,
    clubAnnualPackage,
    playerMonthlyPackage,
    playerAnnualPackage,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: customerInfoQuery.refetch,
    markInitialized,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
