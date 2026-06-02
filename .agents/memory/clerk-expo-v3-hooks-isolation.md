---
name: Clerk Expo v3 hooks isolation
description: useSSO() internally calls legacy useSignIn/useSignUp — must be isolated in its own component
---

## Rule
Never call `useSSO()` from `@clerk/expo` v3 in the same component that also calls
`useSignIn()` or `useSignUp()` from the same package.

## Why
`useSSO()` (dist/hooks/useSSO.js) calls `useSignIn` and `useSignUp` from
`@clerk/react/legacy` internally. Those legacy hooks have a different internal hook call
count than the v3 equivalents, AND the count is not stable during Clerk initialisation.
Placing both generations in one component causes React's hook-count invariant to fire:
"Rendered fewer hooks than expected" — typically attributed to the *parent* component
that renders the mixed component, making it hard to diagnose.

## How to apply
Extract all `useSSO()` usage into a dedicated child component (e.g. `OAuthButtons`).
The child gets `bannedEmails` and colour tokens as props; the parent only uses
`useSignIn` / `useSignUp`. Each component then has a stable hook count.
