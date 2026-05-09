# @chickenpicks/mobile

Native Android client for **ChickenPicks OnChain** — Dev3pack 2026
hackathon, Solana Mobile track ($1.35k Seeker Phones prize).

Built with Expo SDK 53 + React Native 0.76 + Privy RN + Mobile Wallet
Adapter + Anchor.

---

## What this app does

- **Sign in** with email OTP (Privy embedded Solana wallet) **or** an
  installed Solana wallet via Mobile Wallet Adapter (Phantom, Solflare,
  Backpack — Android only).
- **Browse pools** from the Anchor program on devnet
  (`Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut`) via
  `program.account.polla.all()`.
- **Predict scores** for each match in a pool, then `submit_prediction`
  signed locally.
- **Claim prizes** once the pool is settled, calling `claim_prize` —
  USDC pays out to the user's ATA in a single tx.
- **Profile** lists every prediction the signed-in wallet ever made,
  highlighting unclaimed prizes.

The web app handles voice agent, cross-chain LI.FI bridge, and admin
flows — those are intentionally **not** in mobile (Solana Mobile track
scope is the on-chain client, not the full product).

---

## Setup (local dev)

```bash
# from monorepo root
pnpm install
cd apps/mobile

# Configure Privy + EAS — edit app.json → expo.extra:
#   privyAppId:    your Privy app ID (https://dashboard.privy.io)
#   privyClientId: your Privy app's RN client ID
#   eas.projectId: from `eas init` (one-time)
# privyAppId, privyClientId, eas.projectId are placeholders today.

# Run in Expo Go (limited — Privy/MWA need a dev client)
pnpm start

# Build a dev client APK to test Privy + MWA on a real device
eas build -p android --profile development
```

Note: Privy + Mobile Wallet Adapter both rely on native modules that
**don't run in Expo Go**. You need a dev client (or production APK) to
test signing flows end-to-end.

---

## Build APK for the Solana dApp Store

```bash
# 1. One-time: create EAS project + log in
eas login
eas init

# 2. Build a release APK (NOT AAB — dApp Store wants APK initially)
eas build -p android --profile production

# 3. Download the .apk artifact from the EAS build page

# 4. Submit to publish.solanamobile.com via dapp-publishing-cli
#    Docs: https://docs.solanamobile.com/dapp-publishing/intro
npx @solana-mobile/dapp-publishing-cli@latest validate -k <keypair>
npx @solana-mobile/dapp-publishing-cli@latest create app -k <keypair>
npx @solana-mobile/dapp-publishing-cli@latest create release -k <keypair> \
  -b apk-name.apk
npx @solana-mobile/dapp-publishing-cli@latest publish submit -k <keypair>
```

The `eas.json → production` profile is configured for `buildType: apk`
and auto-increments `versionCode` per build.

---

## Project structure

```
apps/mobile/
├── app/                      expo-router file-based routing
│   ├── _layout.tsx           PrivyProvider + Stack
│   ├── index.tsx             login / landing
│   ├── pools/
│   │   ├── index.tsx         browse all pools
│   │   └── [id].tsx          pool detail + predict + claim
│   └── profile.tsx           user's prediction history
├── components/
│   ├── ConnectButton.tsx     Privy email-OTP + MWA dual-button
│   ├── PoolCard.tsx          pool list-item
│   └── MatchRow.tsx          score input row
├── lib/
│   ├── anchor.ts             Anchor program wrapper (mirrors web)
│   ├── constants.ts          vendored from packages/shared
│   ├── format.ts             USDC + status formatters
│   ├── idl.json              copied from packages/anchor-client
│   ├── polyfills.ts          Buffer + crypto + URL for RN
│   ├── privyAdapter.ts       Privy embedded → Anchor Wallet
│   ├── mwaAdapter.ts         MWA (Android) → Anchor Wallet
│   └── useWallet.tsx         unified wallet hook
├── assets/pollitos/          chicken webps (mirror of apps/web/public)
├── app.json                  Expo config
├── eas.json                  EAS Build profiles (APK output)
├── babel.config.js           Expo + NativeWind + Reanimated
├── metro.config.js           NativeWind + Buffer/crypto aliases
├── tailwind.config.js        Tribuna Caliente palette (RN-compatible)
├── global.css                NativeWind entry
└── tsconfig.json             extends expo/tsconfig.base
```

---

## Brand parity

The mobile app reads identical to the web version:

- Same chicken character set (10 webps mirrored from
  `apps/web/public/pollitos/`).
- Same color tokens — gold `#FFD700`, amber `#FF9F1C`, turf `#1FD87F`,
  red-alert `#FF3D57`, dark surfaces `#080C10` / `#10161D`.
- Same display vs body type pairing (Bebas Neue + Outfit). Fonts ship
  via `expo-font` once the user adds the font files; until then the
  system fallback is used.

---

## Known TODOs / hand-off

- `app.json → expo.extra.privyAppId` + `privyClientId` need to be
  filled in before the first build that touches login.
- `app.json → expo.extra.eas.projectId` set by `eas init` on first
  build.
- Bebas Neue + Outfit `.ttf` files: drop them into `assets/fonts/`
  and load via `useFonts()` in `_layout.tsx` to fully match the web
  brand. Without them, `font-display` falls through to system.
- Privy RN's `signTransaction` provider method name has shifted across
  SDK versions — `lib/privyAdapter.ts` notes the canonical name today
  (`signTransaction`). If signing breaks on a Privy upgrade, check
  the [Privy Expo SDK docs](https://docs.privy.io/reference/sdk/expo).
- App icon currently reuses `pollito_capitan_lider.webp`. Generate a
  proper 1024×1024 PNG icon before dApp Store submission.
