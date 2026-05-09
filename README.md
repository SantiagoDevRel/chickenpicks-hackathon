# 🐔 ChickenPicks OnChain

**The football prediction market that can't withhold your winnings.**

Latin Americans bet ~USD 25B/year on football through Stake, Bet365, and a long tail of off-shore books that take 10-20% rake, freeze accounts on a whim, and pay out when they feel like it. ChickenPicks flips that: every pool is an Anchor program on Solana, every prediction is a public on-chain account, ranking runs **inside** `settle_polla`, and the 95% prize pot lives in a vault PDA that **only the winner's pubkey can drain**. There is no "withdrawal review." There is no rake-pulling. One 5% platform fee, transferred atomically inside the same settlement transaction the judge can see in Solana Explorer.

The hard part isn't the contract — it's getting a football fan who has never heard of Solana to use it. So we made the entire product voice-native: a user signs in with email (Privy mints them a Solana wallet behind the scenes), opens the app, taps **🎙 Talk to Coach**, and says *"What pools are open? I have USDC on Polygon — can I use that? Argentina two, Brazil one."* The ElevenLabs agent calls `@lifi/sdk` for a live bridge quote, fires `join_polla` after verbal confirmation, and submits picks — all from one continuous conversation, no wallet UI, no seed phrase, no chain-picker.

Built for **Dev3pack 2026** (deadline 2026-05-12). Claiming **Solana**, **LI.FI**, **ElevenLabs**, and **Solana Mobile** tracks.

---

## 🌐 Demo

| Resource | Link |
|---|---|
| Live web app | https://onchain.chickenpicks.app |
| Android APK (sideload, MWA-compatible) | https://expo.dev/artifacts/eas/hiiDZNqcQ88hvHxT6nVWqt.apk |
| Demo video (3 min) | _added with final submission_ |
| Repo | https://github.com/SantiagoDevRel/chickenpicks-hackathon |
| Solana dApp Store listing | _submission pending review (link on approval)_ |

---

## 📜 Contract addresses (Solana devnet)

| Account | Address | Solana Explorer (devnet) |
|---|---|---|
| Program ID | `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut` | [view](https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet) |
| Platform Authority / Treasury | `76QkvEWDpRW3PnLVz2wctcFJm9dAsXquHTEkwSxxq31H` | [view](https://explorer.solana.com/address/76QkvEWDpRW3PnLVz2wctcFJm9dAsXquHTEkwSxxq31H?cluster=devnet) |
| Test USDC mint (deployer-controlled) | `sWjZfTkMM2zbNBx1YwgYGmsXfZpA1yo5HkhSqB9AUXC` | [view](https://explorer.solana.com/address/sWjZfTkMM2zbNBx1YwgYGmsXfZpA1yo5HkhSqB9AUXC?cluster=devnet) |
| Demo pool — "World Cup with Friends" | `36MP62K6WLuQYL1aJhFCHiUP46gV5PKshWXK6qHxwPZj` | [view](https://explorer.solana.com/address/36MP62K6WLuQYL1aJhFCHiUP46gV5PKshWXK6qHxwPZj?cluster=devnet) |

Cluster: **devnet** · Anchor 0.31 · framework: `anchor-lang 0.31`. Source: [`programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs`](programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs).

The test USDC mint is deployer-controlled so judges can be funded on demand. Demo pool: 1 USDC entry, fake World Cup 2026 — Argentina vs Brazil, Spain vs France, Germany vs Italy. Prize split 50 / 30 / 20.

---

## ⚡ Why this matters

Latin America bets on football. Colombia's regulated sports-betting market alone clears ~USD 1.2B/yr; informal *polla* pools among friends — paid in cash or by Nequi/Daviplata — are 5-10x bigger and entirely unmeasured. Two real frictions block on-chain replacements:

1. **Wallets.** Asking your tio for a seed phrase ends the conversation. Privy + email/OTP removes that. The user never knows there's a Solana wallet under the hood.
2. **Funds.** USDC liquidity in Latam lives on Polygon, BSC, and centralized exchanges, not Solana. LI.FI bridges that gap — voice agent quotes a real route before the user commits a peso.

ChickenPicks puts these together: a fan can join a polla by talking to their phone, in Spanish, paying with USDC from any chain, and the prize math runs in one Solana transaction. No Supabase, no off-chain ledger, no "trust me" — the program is the contract.

---

## ⚡ Why it's different

| | Centralized books (Stake, Bet365) | ChickenPicks OnChain |
|---|---|---|
| Rake | 10-20%, off the top | 5%, transferred atomically on settle |
| Custody | They hold your funds | Vault PDA, strict-signer claim |
| Settlement | Internal ledger, days | One Solana tx, ~400ms |
| Withdrawal | "Under review" | `claim_prize` — only your pubkey works |
| Onboarding | KYC, deposit, wait | Email OTP → embedded wallet → predict |
| UX | 5-10 clicks per bet | One voice conversation |
| Cross-chain entry | Convert and wait | Live LI.FI quote inside the conversation |
| Mobile | Centralized app | Native Android + Solana dApp Store |

---

## ⚽ User flow

**Sign up → Fund → Predict → Claim**

1. **Sign up** — email OTP via Privy, embedded Solana wallet auto-minted.
2. **Fund** — Solana USDC works today; Polygon / Ethereum / Arbitrum / Base / Optimism / BSC marked *coming soon via LI.FI* (live mainnet quotes in the voice agent).
3. **Predict** — UI form or voice ("Argentina two, Brazil one"). Predictions are public on-chain accounts, lock when the first result is posted.
4. **Claim** — winners call `claim_prize`. Strict-signer check on-chain — only the winner's pubkey can withdraw their slice.

<details>
<summary>Detailed step-by-step (click)</summary>

1. Login by email-OTP via Privy. No seed phrases, no MetaMask.
2. Embedded Solana wallet auto-created on first login. Same address on web, mobile, and inside the voice agent.
3. Browse open pools at `/pools`. Each shows entry amount, tournament, matches, prize distribution, current participants.
4. Join with USDC — pay entry, funds enter the polla's vault PDA.
5. Predict scores — for every match, by voice or UI.
6. Voice agent (web + Android via WebView) — one tap talks to ElevenLabs Conv AI. It can list pools, open a pool, check balance, preview a LI.FI bridge quote, join, and submit picks. Verbal confirmation gates every signed tx.
7. Admin posts fake match results at `/admin` (hackathon oracle).
8. Settle on-chain — `settle_polla` ranks all predictions in one tx (simplified scoring: **5** exact / **3** correct outcome / **0** wrong). 5% fee transferred atomically; 95% stays in the vault per the prize distribution.
9. Strict-signer claim — winners call `claim_prize`; only the recorded winner pubkey can withdraw their slice.

</details>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   On-chain (source of truth)                         │
│                  Solana devnet · Anchor 0.31                         │
│  PlatformConfig · Polla · Match · Prediction · Vault (USDC ATA)     │
│  ix: initialize_platform · create_polla · add_match · join_polla    │
│      submit_prediction · set_match_result · settle_polla            │
│      claim_prize                                                     │
└──────────▲────────────────────────────▲──────────────▲──────────────┘
           │ join/predict/claim         │ settle       │ set_match_result
           │ (Privy embedded wallet)    │ (any signer) │ (treasury)
┌──────────┴───────────┐    ┌───────────┴──────────┐    ┌┴───────────┐
│   apps/web (Next 15) │    │  apps/mobile (Expo)  │    │ /admin UI  │
│ Privy · LI.FI quotes │    │  Privy RN · MWA      │    │ fake oracle│
│ ElevenLabs voice     │    │  Native Android APK  │    │ + settle   │
│ (one persistent      │    │  Voice via WebView   │    │            │
│  agent across pages) │    │  embed of /voice-... │    │            │
└──────────────────────┘    └──────────────────────┘    └────────────┘
```

**On-chain**: pollas, vault, predictions, results, settlement, fee, claim. **Off-chain**: UI rendering, Privy auth, ElevenLabs API, mobile shell, admin oracle. **No Supabase. Wallet = identity.**

---

## 🔬 Solana architecture (deep dive)

The Anchor 0.31 program is the **single source of truth** — no off-chain database mirrors any state. Program ID `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut` is deployed and finalized on devnet (BPF Upgradeable Loader, executable).

**Eight instructions, four PDAs.** `initialize_platform`, `create_polla`, `add_match`, `join_polla`, `submit_prediction`, `set_match_result`, `settle_polla`, `claim_prize`. PDA seeds:
- `["platform"]` — `PlatformConfig` (fee bps, treasury)
- `["polla", creator, name]` — `Polla` (vault, prize_distribution, status)
- `["match", polla, match_index]` — `Match` (home_team, away_team, scores)
- `["prediction", polla, predictor]` — `Prediction` (scores, points, final_rank)

Each polla owns a USDC vault as its associated token account (`associated_token::authority = polla`), so the vault PDA self-signs CPI transfers via `CpiContext::new_with_signer` with the polla's own seed bundle.

**On-chain ranking, not off-chain.** `settle_polla` is permissionless. The caller passes all N `Match` accounts + all P `Prediction` accounts via `remaining_accounts`. The program deserializes each, asserts `polla` cross-references match, asserts match indices cover `0..N-1` with no gaps or duplicates, then computes points using the simplified scoring rule (**5 pts** exact score / **3 pts** correct W/D/L outcome / **0 pts** otherwise) implemented pure-Rust in [`scoring.rs`](programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/scoring.rs). Predictions are sorted by `(points DESC, submitted_at_slot ASC)` and `final_rank` is written back to each account via `p.exit(ctx.program_id)?`. **No caller can fake the winners list — the winners come from the on-chain compute.**

**Atomic 5% fee.** The same `settle_polla` tx that ranks predictions also CPIs `token::transfer` from vault → treasury ATA for `total_pool * 500 / 10_000`, signed by the Polla PDA. One transaction. No settlement bot.

**Effective-denominator payout.** `claim_prize` divides by `sum(prize_distribution[0..min(num_participants, MAX_PRIZE_TIERS)])`, **not** by the static `[50, 30, 20]` total. A solo entrant in a 3-tier pool wins 100% of the after-fee pool — never any orphaned funds.

**Math hygiene.** Every multiplication and addition uses `checked_*` and maps to `ChickenPicksError::NumericalOverflow`. **Zero `unwrap()` / `expect()`** in user-facing paths. Division-by-zero guarded by `require!(denom > 0)`.

**Strict-signer claim.** `claim_prize` requires `prediction.predictor == ctx.accounts.predictor` via Anchor `has_one`. There is no admin override — even the treasury cannot pull a winner's slice.

**Tests.**
- [`tests/happy-path.ts`](programs/chickenpicks-onchain/tests/happy-path.ts) — full 8-ix flow on a local validator with 3 users, asserts ranks (10 / 6 / 2 pts), 5% fee = 150,000 base units, top winner payout = 1,425,000 (50% of 95% of 3 USDC), and double-claim revert.
- [`tests/settlement.ts`](programs/chickenpicks-onchain/tests/settlement.ts) — proves tie-break by submission slot.
- [`scoring.rs`](programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/scoring.rs) — 8 Rust unit tests covering all four score branches and defensive edge cases (unsettled match, unset prediction, settled-but-score=-1).

Compute-budget bounds `settle_polla` at ~5 participants per pool. Chunked `settle_polla_partial` is the post-hackathon path for larger pools.

---

## 🏆 Track Fit — what we built for each prize

Every track has source code, deployed bytecode, and on-camera proof.

### Solana ($10k pool)
- Anchor 0.31 Rust program at [`programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs`](programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs) (`declare_id!` line 25).
- 8 instructions in [`src/instructions/`](programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/instructions/). On-chain ranking + atomic 5% fee inside `settle_polla.rs`. Strict-signer `claim_prize.rs`.
- Deployed devnet: [`Cdd53o33...3ut` on Explorer](https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet).
- Demo pool: [`36MP...wPZj` on Explorer](https://explorer.solana.com/address/36MP62K6WLuQYL1aJhFCHiUP46gV5PKshWXK6qHxwPZj?cluster=devnet).
- Tests: 2 TS suites + 8 Rust unit tests.

### LI.FI ($1k)
- Real `@lifi/sdk` integration: [`apps/web/package.json`](apps/web/package.json) (`@lifi/sdk ^3.6.0`).
- Live quote endpoint: [`apps/web/app/api/lifi/quote/route.ts`](apps/web/app/api/lifi/quote/route.ts) calls `getQuote()` for any of 6 EVM chains → Solana USDC (mainnet liquidity, real numbers).
- Voice tool: [`preview_bridge_quote`](apps/web/components/VoiceAgent.tsx) — agent reads back duration + fee + provider from a real mainnet route during the demo conversation.
- UI: [`JoinConfirmModal.tsx`](apps/web/components/JoinConfirmModal.tsx) shows Polygon / ETH / Arbitrum / Base / Optimism / BSC cards (gated *coming soon* until the program is on mainnet).

### ElevenLabs ($1.98k Scale tier)
- `@elevenlabs/react@^0.6.0` ([`apps/web/package.json`](apps/web/package.json)) + signed-URL mint at [`apps/web/app/api/voice/route.ts`](apps/web/app/api/voice/route.ts) (API key stays server-side).
- 9 client tools in [`apps/web/components/VoiceAgent.tsx`](apps/web/components/VoiceAgent.tsx): `list_pools`, `get_pool_details`, `get_current_pool`, `get_user_balance`, `open_pool`, `go_to_page`, `preview_bridge_quote`, `join_pool`, `submit_picks`.
- Voice persistence: one mount in providers, callbacks via React Context ([`apps/web/lib/VoiceContext.tsx`](apps/web/lib/VoiceContext.tsx)) — survives `router.push` between screens.
- **Voice on Android too** — [`apps/web/app/voice-embed/route.ts`](apps/web/app/voice-embed/route.ts) ships a standalone widget page that the mobile app embeds via WebView ([`apps/mobile/components/VoiceCoachModal.tsx`](apps/mobile/components/VoiceCoachModal.tsx)). Same agent, same tools, native-app reach.

### Solana Mobile ($1.35k Seekers)
- Native Android app: [`apps/mobile/`](apps/mobile/) (Expo SDK 53 + RN 0.79, TS strict).
- MWA flow: [`apps/mobile/lib/mwaAdapter.ts`](apps/mobile/lib/mwaAdapter.ts) (`@solana-mobile/mobile-wallet-adapter-protocol-web3js@^2.2.0`) — real `transact()` + `signTransactions`.
- Same Privy account = same Solana pubkey on web and mobile (deterministic embedded wallet).
- APK: https://expo.dev/artifacts/eas/hiiDZNqcQ88hvHxT6nVWqt.apk (sideload-ready).
- dApp Store: submission scripted (`pnpm submit:dapp-store` in [`apps/mobile/package.json`](apps/mobile/package.json)); listing pending review.
- Optimized for **Seeker** hardware: APK <30 MB, MWA dual-mode (Privy embedded for non-crypto-natives + Phantom/Solflare/Backpack via MWA for Genesis Token holders).

---

## 🎙️ Voice agent tools

Nine client tools registered against the ElevenLabs agent (defined in [`apps/web/components/VoiceAgent.tsx`](apps/web/components/VoiceAgent.tsx)):

| Tool | Type | Description |
|---|---|---|
| `list_pools` | read | All open pools (id, name, tournament, entry, participants). Anchor `program.account.polla.all()` filtered by mint. |
| `get_pool_details` | read | For a pool id, returns matches, prize split, and your join status. |
| `get_current_pool` | read | Returns the pool currently open in the user's browser tab. |
| `get_user_balance` | read | User's USDC ATA + SOL balance. |
| `open_pool` | nav | `router.push('/pools/[id]')`. Voice deep-linking. Fuzzy-matches by pool name if input isn't a pubkey. |
| `go_to_page` | nav | Maps named pages (`pools`, `admin`, `home`, `profile`). |
| `preview_bridge_quote` | read | `@lifi/sdk` live quote (e.g. Polygon USDC → Solana USDC). Returns duration + fee + provider. |
| `join_pool` | mutate | Opens Pay & Join modal, awaits verbal confirmation, fires `join_polla`. |
| `submit_picks` | mutate | Reads picks back; on verbal "yes" fires `submit_prediction`. |

Mutating tools accept a `verballyConfirmed: boolean` flag — voice misrecognition is a real failure mode, the resolver short-circuits if false.

---

## 🗂️ Repo structure

```
chickenpicks-hackathon/
├── programs/chickenpicks-onchain/        # Anchor 0.31 program (Rust)
│   └── programs/chickenpicks-onchain/
│       ├── src/
│       │   ├── lib.rs                     # declare_id + entry
│       │   ├── state.rs                   # PDA shapes
│       │   ├── scoring.rs                 # 5/3/0 + unit tests
│       │   ├── errors.rs · constants.rs
│       │   └── instructions/              # 8 ix files
│       └── tests/                         # ts-mocha integration tests
├── apps/
│   ├── web/                               # Next.js 15 + React 19
│   │   ├── app/pollas/[id]/page.tsx       # Join + predict + claim flow
│   │   ├── app/admin/page.tsx             # Hackathon oracle UI
│   │   ├── app/voice-embed/route.ts       # Standalone widget for mobile WebView
│   │   ├── app/api/{voice,lifi/quote,admin/*}/route.ts
│   │   ├── components/VoiceAgent.tsx      # ElevenLabs Conv AI client
│   │   ├── components/PersistentVoiceAgent.tsx + lib/VoiceContext.tsx  # one-mount persistence
│   │   ├── components/JoinConfirmModal.tsx
│   │   └── lib/paymentMethods.ts          # Solana ✅ · LI.FI chains coming soon
│   └── mobile/                            # Expo SDK 53 + RN 0.79
│       ├── app/                           # expo-router screens
│       ├── lib/mwaAdapter.ts              # Solana Mobile Wallet Adapter
│       ├── lib/privyAdapter.ts            # Privy embedded → Anchor wallet
│       ├── lib/polyfills.ts               # Hermes shims (structuredClone, withResolvers, …)
│       └── components/VoiceCoachModal.tsx # WebView wrapping /voice-embed
├── packages/
│   ├── shared/                            # cross-app types + constants
│   └── anchor-client/                     # generated TS client + checked-in IDL
├── scripts/
│   ├── init-platform.ts                   # one-shot platform init
│   ├── seed-demo-polla.ts                 # creates "World Cup with Friends"
│   ├── post-results.ts                    # fake-oracle results posting
│   ├── settle-polla.ts                    # admin settlement
│   ├── fund-user.ts                       # devnet test USDC drop
│   └── eas-{trigger,poll,log}.sh          # EAS build helpers
└── docs/
    ├── SETUP.md                           # toolchain bootstrap (WSL2 / Solana / Anchor)
    └── sponsors/                          # solana / elevenlabs / lifi / solana-mobile
```

---

## ⚡ Quick start (developers)

```powershell
pnpm install
pnpm seed:demo                         # seeds the World Cup demo pool on devnet
pnpm --filter @chickenpicks/web dev    # http://localhost:3000
```

For the deeper toolchain (WSL2 + Solana CLI 2.x + Anchor 0.31 + Privy + ElevenLabs accounts + DNS), follow [docs/SETUP.md](docs/SETUP.md).

For the **Anchor program build / test**:

```bash
cd programs/chickenpicks-onchain
anchor build
anchor test                            # local validator + ts-mocha suites
cargo test                             # 8 Rust unit tests in scoring.rs
```

---

## ⚠️ Known limitations (hackathon scope)

- **Fake oracle** — admin manually posts match results via `/admin`. Real oracle (Pyth Pull, Switchboard, or optimistic) is post-hackathon.
- **Settlement bounded to ~5 participants per pool** — `settle_polla` ranks all predictions in a single tx; compute-budget puts the safe ceiling around five players. Larger pools need chunked `settle_polla_partial`.
- **LI.FI mainnet-only on Solana** — our program is on devnet, so LI.FI quotes are *preview only* (real mainnet liquidity, no actual swap). Same Privy address on both networks keeps visual continuity.
- **Devnet program with deployer-controlled test USDC mint** — judges can be funded directly. Mainnet migration documented in [docs/sponsors/solana.md](docs/sponsors/solana.md); program code is mainnet-ready.
- **Admin auth via header allowlist** — `/api/admin/*` trusts an `X-Admin-Email` header against `ADMIN_EMAILS` env. Pre-prod migration to `privy.verifyAuthToken()` is documented in code comments.

---

## 📸 Screenshots

_TODO: pin three screenshots before submission — landing.png, voice-agent-conversation.png, settle-tx-on-explorer.png._

---

## 🐔 Brand

**ChickenPicks OnChain** — built for the football fan who wants their predictions on-chain without learning how Solana works. Same wallet on web and mobile, four sponsor tracks, one product — and the only key that can pull a winner's prize is the winner's.

---

## 📄 License

Source-available for hackathon judging. License TBD post-event.
