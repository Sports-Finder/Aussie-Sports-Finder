# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

Aussie Sports Club Finder is an Australian-focused Expo mobile app artifact for players and sports clubs to post adverts, connect, message privately, manage profiles, submit profile images for admin moderation, enable nearby advert alerts, and open club locations in Apple Maps or Google Maps. The first build stores marketplace data locally with AsyncStorage.

The mobile app now uses top-level sport filtering. Approved sports are defined in `artifacts/sports-connect/constants/sports.ts` with per-sport colour themes, and app state stores approved sports, pending sport requests, and the selected sport in AsyncStorage under `sports-connect-state-v4-sport-filters`. New sport requests can be submitted from Discover and approved/rejected from the Profile admin section before appearing in filters and posting. The shared colour hook applies the selected sport theme across the whole app background, tabs, chips, and primary buttons.

Account onboarding is local-first in the Expo app. `components/OnboardingGate.tsx` gates the app until a user chooses Apple, Google, or email sign-up, completes bot/email-verification UI, selects one of four account roles (player 18+, parent/guardian for under-18 player, coach, club), and submits the required account setup form. Account data, pending profile images, highlight reel links, and moderation state are persisted in AsyncStorage under `sports-connect-state-v5-account-onboarding`.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile artifact**: Expo app at `artifacts/sports-connect`

## Required Secrets

- `CONTACT_EMAIL_USER` — Gmail address used as the sender for Contact Us emails (e.g. `aussiesportsclubfinder@gmail.com`)
- `CONTACT_EMAIL_PASS` — Gmail App Password for that account (not the account password). If absent, the `/api/contact` endpoint returns 500 and logs a clear error; no emails are sent.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## EAS Internal Distribution Build (iOS)

### One-time setup
Before running your first build, update `artifacts/sports-connect/eas.json` — replace `YOUR_DEPLOYMENT.replit.app` in both the `internal` and `production` profiles with the real deployed API server URL (e.g. `my-project.replit.app`). Do **not** include `https://` — the app prepends it automatically.

### Running a build
From your local terminal (requires Expo CLI and an EAS account logged in as `aussie-sports-finder`):

```bash
cd artifacts/sports-connect
eas build --profile internal --platform ios
```

EAS handles code signing automatically for Internal Distribution — no Apple Developer Portal setup needed. When the build completes you will receive a QR code / install link to share with testers.

### Expo account details
- **Owner / username:** `aussie-sports-finder`
- **Bundle identifier:** `com.aussiesportsfinder`
- **EAS profile for testers:** `internal`
- **EAS profile for App Store:** `production`
