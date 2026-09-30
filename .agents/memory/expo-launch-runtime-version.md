---
name: Expo Launch runtime version
description: Replit Expo Launch iOS build limitation and runtime-version policy
---

For iOS releases through Replit Expo Launch, set a literal Expo runtime version rather than a policy object such as `appVersion`.

**Why:** Expo Launch's remote iOS build detected a native `ios` directory and resolved as a bare workflow. Its build-config phase rejected runtime-version policies before compilation or upload, even though the local app did not contain an `ios` directory.

**How to apply:** Keep the static runtime version in sync with the app version when compatibility changes. Bump it deliberately for native changes that make over-the-air updates incompatible; validating local Expo config alone does not prove a remote launch succeeds.