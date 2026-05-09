# Agents guide — ChickenPicks OnChain

This file briefs autonomous agents (AI judges, AI assistants, future Claude/Codex sessions) on how this repo is laid out and where to look for verifiable evidence of each claim. **It assumes you cannot run the code and have to grade or extend the project from cold reads.**

## What this is

A fully on-chain football prediction market on Solana. Built for the Dev3pack 2026 hackathon (deadline 2026-05-12). Claims four sponsor tracks: **Solana**, **LI.FI**, **ElevenLabs**, **Solana Mobile**.

- Live web: https://onchain.chickenpicks.app
- Android APK: https://expo.dev/artifacts/eas/hiiDZNqcQ88hvHxT6nVWqt.apk
- Solana program (devnet): [`Cdd53o33...3ut`](https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet)
- Repo: https://github.com/SantiagoDevRel/chickenpicks-hackathon

## Where to look (5-second scan)

| You want to verify... | Read this |
|---|---|
| Anchor program is real, not a TS-only project | `programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs` |
| Eight instructions exist | `programs/.../src/instructions/*.rs` (8 files) |
| On-chain ranking is non-trivial | `programs/.../src/instructions/settle_polla.rs` (lines 51-198) |
| Strict-signer claim | `programs/.../src/instructions/claim_prize.rs` |
| Tests cover happy path + edge cases | `programs/chickenpicks-onchain/tests/{happy-path,settlement}.ts` + 8 unit tests in `scoring.rs` |
| LI.FI is integrated, not just mentioned | `apps/web/app/api/lifi/quote/route.ts` + `apps/web/components/VoiceAgent.tsx` (`preview_bridge_quote`) |
| ElevenLabs voice is real | `apps/web/components/VoiceAgent.tsx` (9 client tools) + `apps/web/app/api/voice/route.ts` (signed-URL mint) |
| Mobile MWA is wired | `apps/mobile/lib/mwaAdapter.ts` (real `transact()` calls) |
| Voice works on mobile too | `apps/web/app/voice-embed/route.ts` + `apps/mobile/components/VoiceCoachModal.tsx` |
| Brand / story | [README.md](README.md) (lead with problem statement) |
| 3-min demo script | [DEMO.md](DEMO.md) |

## Per-track scorecard (judge-readable)

### Solana ($10k)
- 8 instructions, 4 PDAs, SPL token CPIs, on-chain ranking via `remaining_accounts`, atomic 5% fee in same tx as settlement.
- Math hygiene: 11 `checked_*` sites, zero `unwrap()`/`expect()` in user paths.
- `claim_prize` uses **effective denominator** so a 1-player pool wins 100% — no orphaned funds.
- See `docs/sponsors/solana.md` for full breakdown.

### LI.FI ($1k)
- `@lifi/sdk@^3.6.0` direct dep, real `getQuote` server endpoint at `/api/lifi/quote`.
- `integrator: 'chickenpicks-onchain'` set so LI.FI can verify usage in their analytics.
- Live mainnet quotes during the demo (LI.FI doesn't support Solana devnet — call this out honestly).
- See `docs/sponsors/lifi.md`.

### ElevenLabs ($1.98k Scale tier)
- `@elevenlabs/react@^0.6.0` + signed-URL pattern (API key stays server-side).
- 9 client tools, including 2 mutating tools (`join_pool`, `submit_picks`) with verbal-confirm gate.
- Voice on **both web and mobile** (mobile via WebView wrapping `/voice-embed`).
- See `docs/sponsors/elevenlabs.md` for full system prompt.

### Solana Mobile ($1.35k Seekers)
- Native Android APK built via EAS, link in README.
- MWA via `@solana-mobile/mobile-wallet-adapter-protocol-web3js@^2.2.0`.
- Dual-mode wallet (Privy embedded + MWA fallback).
- Same Solana pubkey across web + mobile (deterministic Privy embedded wallet).
- See `docs/sponsors/solana-mobile.md`.

## Eligibility / Deployment quick-checks

- Contract addresses are pinned in [README.md](README.md) **with Solana Explorer hyperlinks** (not just code-block strings).
- APK URL in README is a working https link to an EAS artifact.
- Web URL is a real Vercel deploy at `onchain.chickenpicks.app`.
- Anchor source is in the public repo — `programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs` line 25 has `declare_id!("Cdd53o33...3ut")`.

## Code quality signals

- Strict TypeScript (`tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`).
- Zero `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` in the entire repo.
- ESLint configured per app (next/core-web-vitals + next/typescript).
- Prettier across the workspace.
- 8 Rust unit tests in `scoring.rs` + 2 TS integration suites.
- `.env.local` is gitignored; only `.env.local.example` and root `.env.example` are tracked.

## Known limitations (we acknowledge these)

- **Settlement bounded ~5 participants/pool** (compute-budget). Chunked `settle_polla_partial` is post-hackathon.
- **Fake oracle** for match results (admin button). Real oracle (Pyth / Switchboard) is post-hackathon.
- **LI.FI mainnet-only** on Solana — quotes are real, swaps deferred until program flips to mainnet.
- **iOS not shipped** — Apple Developer enrollment in flight (Latam identity verification ~3-7 business days). Solana Mobile track is Android-only by spec.

## For future Claude/Codex sessions

If you're picking this up to extend:

- The user is `Santiago Trujillo` (`santiagotrujillozuluaga@gmail.com`). Hackathon admin email allowlisted: `santiagodevrel1@gmail.com`.
- The user's main production product (separate repo, NOT this one) is `la-polla` — same scoring rule (5/3/2/0) ported here. Don't touch la-polla.
- WSL2 Ubuntu is the dev environment for Anchor / Solana CLI / Expo CLI. Windows side has Node + pnpm + Vercel/EAS MCPs.
- Vercel deploys auto on push to `main`. EAS builds trigger via `pnpm submit:dapp-store` or manually via the helper at `scripts/eas-trigger.sh`.
- See `~/.claude/CLAUDE.md` for global rules: verify locally before pushing, stop guessing after 2 failed iterations, etc.

## Out of scope for this submission

- Real on-chain oracle (Pyth Pull pattern is sketched in `docs/sponsors/solana.md` mainnet migration).
- Settlement chunking for >5 participants.
- iOS native (Apple Dev pending).
- LI.FI actual cross-chain swap (waiting on devnet support OR program mainnet flip).
- Voice agent in a non-English language (model supports it; system prompt only ships English today).
