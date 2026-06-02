---
name: Clerk Expo auth setup
description: Key decisions and gotchas for the Replit-managed Clerk + Expo SDK 54 integration in this project.
---

## ClerkLoading + ClerkLoaded pattern (required)
`ClerkLoaded` renders null until Clerk initialises. Without a sibling `ClerkLoading` component, the app shows a blank white screen on startup. Always pair them:

```tsx
<ClerkLoading><LoadingSpinner /></ClerkLoading>
<ClerkLoaded><AppContent /></ClerkLoaded>
```

**Why:** Clerk initialisation is async. `ClerkLoaded` is a conditional render gate — it renders nothing until `isLoaded` is true.

**How to apply:** Any time ClerkProvider wraps an app, add a ClerkLoading sibling with a visible loading indicator.

## EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
Must be prepended to the `dev` script in `package.json`:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY expo start ...
```
And passed in `scripts/build.js` `startMetro` env object under the same key.

## SignInFields type — field name for email in sign-in
The `useSignIn()` errors object uses `identifier` (not `emailAddress`) for the email field in sign-in flows. `emailAddress` is only for `useSignUp()`.

```tsx
siErrors.fields.identifier  // sign-in email error
suErrors.fields.emailAddress // sign-up email error
```

## State-gated navigation (no explicit router.push on auth)
This app uses state-driven auth gating: `AppContent` checks `isSignedIn` and renders `OnboardingGate` or `RootLayoutNav`. When Clerk's `finalize()` / `setActive()` succeeds, `isSignedIn` becomes true and the app re-renders automatically. No explicit `router.push` needed after auth. Pass `navigate: () => {}` as a no-op.

## Admin/moderator bypass
Admins and moderators authenticate via passcode (local AsyncStorage), independent of Clerk. They are gated in `OnboardingGate` before the Clerk sign-in UI. No Clerk account needed for admin/moderator access.

## Token getter wiring
`setAuthTokenGetter(() => getToken())` from `@workspace/api-client-react` is called in `app/(tabs)/_layout.tsx` via `useEffect`, wiring Clerk's `getToken()` to all API requests. Not in `_layout.tsx` (too high, outside tabs).
