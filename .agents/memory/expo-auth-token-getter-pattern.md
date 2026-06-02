---
name: Expo auth token getter — ref pattern
description: How to safely wire setAuthTokenGetter in AppContent / TabLayout for @workspace/api-client-react
---

## Rule
Use a `useRef` to register the auth token getter — NOT `useEffect([getToken])`.

## Why
`getToken` from Clerk's `useAuth()` may be a stable function reference that doesn't
change after sign-in. If so, `useEffect([getToken])` runs only once on mount and never
updates. The captured closure calls the pre-sign-in function. Also, Expo Fast Refresh
can reset the module-level `_authTokenGetter` to null without changing the `getToken`
reference, so the effect never re-registers.

## Correct pattern
```typescript
const getTokenRef = useRef(getToken);
getTokenRef.current = getToken; // update ref on every render (React allows this)

useEffect(() => {
  setAuthTokenGetter(() => getTokenRef.current());
  // No cleanup — leave getter active; both AppContent and TabLayout do this and
  // the last-registered one wins (both point to the same Clerk singleton).
}, []); // mount once only
```

## Where applied
- `app/_layout.tsx` AppContent
- `app/(tabs)/_layout.tsx` TabLayout
