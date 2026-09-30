---
name: Expo Hermes release bundles
description: Why the iOS release bundle needs an explicit Metro transform profile
---

For this Expo SDK 54 / React Native 0.81 app, keep Metro's `unstable_transformProfile` set to `default` for native release builds. Keep the Babel preset aligned to the Expo SDK and retain the private-field transforms.

**Why:** The bundled Hermes compiler rejects ordinary `class` declarations in the release JavaScript, even after private fields have been rewritten. Adding Babel's class transform directly instead can turn TypeScript constructor parameter properties in Expo sources into invalid JavaScript. The default Metro profile successfully produced Hermes bytecode in a local iOS export. Metro's persisted transform cache can hide changes during debugging, so verify a clean-cache export before concluding a fix failed.

**How to apply:** After changing Babel or Metro configuration, validate an iOS release export with bytecode generation and a fresh transform cache. This confirms JavaScript compilation, not a complete remote iOS archive or TestFlight upload.