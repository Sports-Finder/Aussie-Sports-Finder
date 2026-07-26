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

// Module-level flag: true once Purchases.logIn() has resolved for the current
// Clerk user, so entitlement queries/sync never run against anonymous data.
let _userIdentified = false;
// Callbacks registered by SubscriptionProvider to react when logIn resolves.
const _identifyListeners: Array<() => void> = [];

export function identifyRevenueCatUser(userId: string) {
  if (!_initialized) return;
  _userIdentified = false;
  Purchases.logIn(userId)
    .then(() => {
      _userIdentified = true;
      // Notify all active SubscriptionProvider instances.
      _identifyListeners.forEach((cb) => cb());
    })
    .catch((err) => {
      console.warn("RevenueCat logIn failed:", err);
      // Treat a failed logIn as "identified" so the app is never permanently
      // locked — entitlements will just come back empty for this user.
      _userIdentified = true;
      _identifyListeners.forEach((cb) => cb());
    });
}

function useSubscriptionContext() {
  const qc = useQueryClient();

  // ready: SDK configured. userIdentified: logIn() resolved for the Clerk user.
  const [ready, setReady] = useState(_initialized);
  const [userIdentified, setUserIdentified] = useState(_userIdentified);

  const markInitialized = () => {
    _initialized = true;
    setReady(true);
    // Kick off queries only if logIn has already resolved (or no user yet).
    qc.invalidateQueries({ queryKey: ["revenuecat"] });
  };

  // Subscribe to logIn completion events for the lifetime of this context.
  React.useEffect(() => {
    const cb = () => {
      setUserIdentified(true);
      qc.invalidateQueries({ queryKey: ["revenuecat"] });
    };
    _identifyListeners.push(cb);
    // Sync with current global state in case logIn already resolved.
    if (_userIdentified) setUserIdentified(true);
    return () => {
      const idx = _identifyListeners.indexOf(cb);
      if (idx !== -1) _identifyListeners.splice(idx, 1);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Queries are enabled only once SDK is configured AND the Clerk user is
  // logged into RC. This prevents stale anonymous customerInfo from being
  // treated as authoritative and causing a false "inactive" downgrade.
  const queriesEnabled = ready && userIdentified;

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    enabled: queriesEnabled,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
    enabled: queriesEnabled,
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
    userIdentified,
    isLoading: !queriesEnabled || customerInfoQuery.isLoading || offeringsQuery.isLoading,
    offeringsError: offeringsQuery.error,
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
