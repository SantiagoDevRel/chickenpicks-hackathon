# Solana Mobile integration

ChickenPicks OnChain ships a native Android app alongside the web app. Same Privy account, same Solana address, same Anchor program — judges can sign in on the phone with the email used on web and pick up the exact same wallet state.

## Where it lives

- **Path**: `apps/mobile/`
- **Stack**: Expo SDK 53, React Native, TypeScript.
- **Auth**: `@privy-io/expo` (RN bindings of the same Privy app used by the web client).
- **Wallet adapter**: `@solana-mobile/mobile-wallet-adapter-protocol` (MWA) for any user who prefers their own Solana mobile wallet (Phantom, Solflare) instead of the Privy embedded wallet.
- **Anchor client**: `packages/anchor-client` — same generated TS client + checked-in IDL the web app uses.

## What's shipped

- Email / phone login (Privy).
- Browse open pools — the same `program.account.polla.all()` call as web.
- Pool detail page with matches + your prediction status.
- Join pool — pays USDC entry from the embedded wallet (or via MWA if a connected wallet is preferred).
- Submit prediction — UI form, no voice on mobile yet.
- Claim — strict-signer claim flows back into the embedded wallet's USDC ATA.

## Why same address as web matters

Privy mints a deterministic embedded wallet keyed off the user's Privy account. Logging in with the same email on web and mobile yields the **same Solana pubkey** — funds joined on web are claimable on mobile and vice versa. This is critical for the demo's mobile cutaway: the audience sees the same `4xT...9Hq` address they saw on web, with the same balance.

## MWA flow

When the user toggles "Use my own wallet" in Settings, the join + submit + claim flows route through the standard MWA `transact` / `signAndSendTransactions` calls. This is the path Solana Mobile judges expect to see — the Privy embedded path is the simplified default for non-crypto-native users.

## Distribution

- **Android APK** — built via `eas build --platform android --profile preview`. Direct sideload for judges; download link in the README.
- **Solana dApp Store** — package metadata + screenshots prepared; submission is post-hackathon (publishing requires a few business days, outside the demo window).

## Known limitations

- **iOS not shipped** — Privy + Expo on iOS works but Apple review is days; out of scope for a 36-hour event.
- **No voice on mobile** — the ElevenLabs flow is web-only this round. Mic permissions + RN bridge + audio routing is post-hackathon work.
