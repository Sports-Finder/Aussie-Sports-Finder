import { useSportsConnect } from "@/context/SportsConnectContext";
import { useSubscription } from "@/lib/revenuecat";

/**
 * Returns true if the current user has an active premium entitlement.
 *
 * Combines two sources of truth so the UI responds immediately:
 *  1. RevenueCat `isSubscribed` — live paid/trial subscription from the store
 *  2. `currentAccount.promotionalPremium` — admin-granted free entitlement stored
 *     in the DB and mirrored into local state. This updates the moment an admin
 *     toggles it, without waiting for RevenueCat's customer-info cache to refresh.
 */
export function useIsPremium(): boolean {
  const { isSubscribed } = useSubscription();
  const { currentAccount, devBypassSubscription } = useSportsConnect();
  return devBypassSubscription || isSubscribed || !!currentAccount?.promotionalPremium;
}
