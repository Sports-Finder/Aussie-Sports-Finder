---
name: Expo Launch Clerk keys
description: Production authentication configuration in Replit Expo Launch builds
---

Do not pin a development Clerk publishable key or proxy URL in iOS build-profile environment settings. Let Replit's Expo Launch flow inject the production Clerk settings during publishing.

**Why:** Build-profile environment values can override the production settings Expo Launch supplies. A development key paired with a production proxy can leave a TestFlight app unable to initialise authentication, while the development preview still works. A successful upload or local iOS bytecode export cannot prove sign-in starts on a phone.

**How to apply:** When a TestFlight build opens to a blank screen before login, check the release profile for pinned Clerk values before changing the auth flow or secrets. After fixing it, validate a clean iOS release bundle and confirm the replacement build on a device.