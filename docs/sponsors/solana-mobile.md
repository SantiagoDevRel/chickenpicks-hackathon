# Solana Mobile integration — ChickenPicks OnChain

ChickenPicks ships a native Android app alongside the web app. **Same Privy account → same Solana address → same Anchor program** — judges can sign in on the phone with the email used on web and pick up the exact same wallet state.

## What's shipped

- **Native Android APK** (sideload-ready): https://expo.dev/artifacts/eas/hiiDZNqcQ88hvHxT6nVWqt.apk
- **Solana dApp Store** listing: submission scripted (`pnpm submit:dapp-store`); listing pending review.
- **Mobile Wallet Adapter** (MWA) — dual-mode wallet: Privy embedded (default for non-crypto-natives) + Phantom / Solflare / Backpack via MWA `transact()` (Genesis Token holders + power users).
- **Voice agent on Android** — same ElevenLabs agent as web, embedded in a `<WebView>` (see [`elevenlabs.md`](elevenlabs.md)).

## Where it lives

| File | Role |
|---|---|
| [`apps/mobile/app/`](../../apps/mobile/app/) | expo-router screens (login, pools list, pool detail, profile). |
| [`apps/mobile/lib/mwaAdapter.ts`](../../apps/mobile/lib/mwaAdapter.ts) | Real `transact()` calls for `authorize`, `reauthorize`, `signTransactions`, `deauthorize`. Auth token cached for re-use. |
| [`apps/mobile/lib/privyAdapter.ts`](../../apps/mobile/lib/privyAdapter.ts) | Adapter that turns the Privy embedded Solana wallet into an Anchor `Wallet` interface. |
| [`apps/mobile/lib/useWallet.tsx`](../../apps/mobile/lib/useWallet.tsx) | Single hook exposing `{ wallet, pubkey, source }` — screens consume it without knowing if the signer is Privy or MWA. |
| [`apps/mobile/components/ConnectButton.tsx`](../../apps/mobile/components/ConnectButton.tsx) | "SIGN IN" (Privy email) + "WALLET APP" (MWA, Android-gated) CTAs. Live SOL + USDC balance pill. |
| [`apps/mobile/components/VoiceCoachModal.tsx`](../../apps/mobile/components/VoiceCoachModal.tsx) | WebView wrapping the ElevenLabs widget — voice on mobile. |
| [`apps/mobile/app.json`](../../apps/mobile/app.json) | App ID `app.chickenpicks.onchain`, minSdk 24, targetSdk 35, `RECORD_AUDIO` permission for voice. |
| [`apps/mobile/eas.json`](../../apps/mobile/eas.json) | EAS build profiles (preview = APK; production = AAB for store). |

## MWA call sites

| Site | What it does |
|---|---|
| [`mwaAdapter.ts:31`](../../apps/mobile/lib/mwaAdapter.ts) | `transact()` for initial `authorize` — opens the user's installed wallet, asks for their pubkey + auth token. |
| [`mwaAdapter.ts:51`](../../apps/mobile/lib/mwaAdapter.ts) | `transact()` for `deauthorize` on disconnect. |
| [`mwaAdapter.ts:63`](../../apps/mobile/lib/mwaAdapter.ts) | `transact()` for single-tx `signTransactions` — used for `join_polla`, `submit_prediction`, `claim_prize`. |
| [`mwaAdapter.ts:76`](../../apps/mobile/lib/mwaAdapter.ts) | `transact()` for batch `signTransactions`. |
| [`ConnectButton.tsx:115-124`](../../apps/mobile/components/ConnectButton.tsx) | Android-gated "WALLET APP" CTA — only renders on `Platform.OS === 'android'`. |

`@solana-mobile/mobile-wallet-adapter-protocol` and `-protocol-web3js` are pinned at `^2.2.0`.

## Why same address as web matters

Privy mints a **deterministic embedded wallet** keyed off the user's Privy account. Logging in with the same email on web and mobile yields the **same Solana pubkey** — funds joined on web are claimable on mobile and vice versa. This is critical for the demo's mobile cutaway: the audience sees the same `9o8J…45wK` address they saw on web, with the same balance.

## Seeker optimization

- **APK <30 MB** targets the Seeker hardware constraint.
- **Genesis Token holders bypass Privy email** — they tap "WALLET APP" → MWA opens their integrated Seeker wallet → same shared-pubkey identity as the rest of the user base.
- **App ID `app.chickenpicks.onchain`** reserved for the Solana dApp Store listing.
- **MWA `chain: 'solana:devnet'`** — real-wallet (Phantom/Solflare) users will need their wallet on devnet during the hackathon. Mainnet flip is a one-line change post-hackathon (see `mwaAdapter.ts`).

## Distribution

- **Direct sideload** — APK link pinned in [README.md](../../README.md). Judges can install in 30 seconds (Settings → Install unknown apps → enable for browser → tap APK → Install).
- **Solana dApp Store** — `apps/mobile/package.json` ships a `submit:dapp-store` script that runs `dapp-publishing-cli`. Submission scripted; listing pending review at submission time.

## dApp Store submission checklist

- [x] App identifier reserved: `app.chickenpicks.onchain`
- [x] Native APK building cleanly via `eas build -p android --profile preview`
- [x] MWA flow exercised end-to-end (sign authorize + sign transactions)
- [ ] 1024×1024 PNG icon (replace the WebP captain pollito for store metadata)
- [ ] `apps/mobile/dapp-store/config.yaml` with publisher / app / release blocks
- [ ] 5 portrait screenshots (1080×1920): landing, pools list, pool detail, predict modal with MWA sign, claim success
- [ ] Generate publisher keypair: `solana-keygen new -o dapp-store/keypair.json`. Fund with 0.1 SOL on mainnet.
- [ ] Validate: `npx @solana-mobile/dapp-publishing-cli@latest validate -k dapp-store/keypair.json`
- [ ] Submit: `create app` → `create release -b path/to/release.apk` → `publish submit`
- [ ] Backfill listing URL into [README.md](../../README.md) and this doc

## Known limitations

- **iOS not shipped** — Apple Developer enrollment was paid May 4 but identity verification is in flight (Apple delays for Latam accounts are 3-7 business days). Privy + Expo on iOS works — once Apple approves, an iOS build is ~1h additional work via EAS. Solana Mobile track does not require iOS.
- **devnet-only program** — MWA users sign devnet txs during the hackathon. Mainnet migration is documented in [solana.md](solana.md).

## Track requirements satisfied

- ✅ Native Android APK — built via EAS, sideload-ready link in README.
- ✅ MWA wired with real `transact()` calls (`@solana-mobile/mobile-wallet-adapter-protocol-web3js@^2.2.0`).
- ✅ Solana dApp Store submission scripted and ready to fire (one CLI command).
- ✅ Seeker-aware: small APK, dual-mode wallet, app ID reserved.
- ✅ Same Solana address across web + mobile (deterministic Privy embedded wallet).
- ✅ Voice agent works on Android too (WebView embed of the ElevenLabs widget) — bonus cross-platform parity.
