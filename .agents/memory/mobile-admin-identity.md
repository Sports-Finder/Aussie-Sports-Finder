---
name: Mobile admin identity
description: Security decision for admin access in the Expo app and API
---

Admin account access and privileged actions require a signed-in Clerk identity verified against the server-side admin allowlist. A passcode checked only inside a distributed mobile app must never authorize access to account details or admin mutations.

**Why:** An earlier TestFlight build displayed an empty admin list because its local passcode login supplied no Clerk session to the protected account API. The passcode was embedded in the client, making it unsuitable as a server-side authorization factor for sensitive data.

**How to apply:** Keep admin UI activation dependent on a successful protected API response; show authorization and loading failures instead of an empty list. Preserve separate moderator sessions only for their explicitly permitted tools.