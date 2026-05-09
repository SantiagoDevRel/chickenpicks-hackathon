# 🐔 ChickenPicks OnChain

**Football prediction markets on Solana — talk to your wallet, predict by voice, settle on-chain.**

Built for the **Dev3pack Global Hackathon** (deadline 2026-05-12). A fully on-chain prediction pool ("polla") product where users sign in with a phone or email, get an embedded Solana wallet, and join + predict + claim entirely from a voice conversation. Source of truth is the Anchor program — no Supabase, no off-chain ledger.

---

## 🌐 Demo

| Resource | Link |
|---|---|
| Live web app | https://onchain.chickenpicks.app |
| Demo video (3 min) | *<YouTube link — added with submission>* |
| Android APK | *<release link — also on Solana dApp Store>* |
| Repo | https://github.com/SantiagoDevRel/chickenpicks-hackathon |

---

## 📜 Contract addresses (Solana devnet)

| Account | Address |
|---|---|
| Program ID | `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut` |
| Platform Authority / Treasury | `76QkvEWDpRW3PnLVz2wctcFJm9dAsXquHTEkwSxxq31H` |
| Test USDC mint (custom) | `sWjZfTkMM2zbNBx1YwgYGmsXfZpA1yo5HkhSqB9AUXC` |
| Demo pool — "World Cup with Friends" | `36MP62K6WLuQYL1aJhFCHiUP46gV5PKshWXK6qHxwPZj` |

Cluster: **devnet** (faucet-funded, mainnet-deploy-ready). The test USDC mint is deployer-controlled so judges can be funded on demand.

Demo pool: 1 USDC entry, World Cup 2026 (fake) — Argentina vs Brazil, Spain vs France, Germany vs Italy. Prize split 50 / 30 / 20.

---

## ⚽ What it does

1. **Login by phone OTP or email** via Privy. No seed phrases, no MetaMask.
2. **Embedded Solana wallet auto-created** on first login. Same address on web, mobile, and inside the voice agent.
3. **Browse open pools** at `/pools`. Each shows entry amount, tournament, matches, prize distribution, and current participants.
4. **Join with USDC** — pay entry, funds enter the polla's vault PDA. Native Solana USDC today; Polygon / Ethereum / Arbitrum / Base / Optimism via LI.FI marked "coming soon" (built, gated on mainnet flip).
5. **Predict scores** — for every match, by voice or UI. Predictions are public on-chain and lock when the first result is posted.
6. **Voice agent** (web) — one click talks to ElevenLabs Conversational AI. It can list pools, open a pool page, check your balance, preview a LI.FI bridge quote, join, and submit picks. Verbal confirmation gates every signed tx.
7. **Admin posts fake match results** at `/admin` (hackathon oracle).
8. **Settle on-chain** — `settle_polla` ranks all predictions in one tx using the la-polla scoring rule (5 pts exact, 3 pts goal-difference, 2 pts winner, 0 otherwise). 5 % platform fee transferred atomically; 95 % stays in the vault per the prize distribution.
9. **Strict-signer claim** — winners call `claim_prize`; only the recorded winner pubkey can withdraw their slice.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   On-chain (source of truth)                         │
│                  Solana devnet · Anchor 0.31                         │
│  PlatformConfig · Polla · Match · Prediction · Vault (USDC ATA)     │
│  ix: initialize_platform · create_polla · join_polla · submit_      │
│      prediction · post_match_result · settle_polla · claim_prize    │
└──────────▲────────────────────────────▲──────────────▲──────────────┘
           │ join/predict/claim         │ settle       │ post_result
           │ (Privy embedded wallet)    │ (any signer) │ (treasury)
┌──────────┴───────────┐    ┌───────────┴──────────┐    ┌┴───────────┐
│   apps/web (Next 15) │    │  apps/mobile (Expo)  │    │ /admin UI  │
│ Privy · LI.FI quotes │    │  Privy RN · MWA      │    │ fake oracle│
│ ElevenLabs voice     │    │  Native Android APK  │    │ + settle   │
└──────────────────────┘    └──────────────────────┘    └────────────┘
```

**On-chain**: pollas, vault, predictions, results, settlement, fee. **Off-chain**: UI rendering, Privy auth, ElevenLabs API, mobile shell, admin oracle. **No Supabase. Wallet = identity.**

---

## 🤝 Sponsor integrations

- **Solana** → [docs/sponsors/solana.md](docs/sponsors/solana.md). Anchor 0.31 program with seven instructions; on-chain ranking using a fixed-cap scoring loop; atomic 5 % fee transfer in the same `settle_polla` tx; strict-signer `claim_prize` enforcing `winner_pubkey == ctx.accounts.winner.key()`.
- **LI.FI** → [docs/sponsors/lifi.md](docs/sponsors/lifi.md). Cross-chain USDC entry via `@lifi/sdk`. Voice agent's `preview_bridge_quote` tool reads back a live route ("from Polygon, ~30s, 5¢ in fees, via Mayan") inside the conversation. The Pay & Join modal exposes Polygon / Ethereum / Arbitrum / Base / Optimism cards (gated `coming-soon` until mainnet flip — Solana USDC works today).
- **ElevenLabs** → [docs/sponsors/elevenlabs.md](docs/sponsors/elevenlabs.md). Conversational AI agent with eight client tools, end-to-end voice flow: discover → navigate → quote bridge → join → submit picks. Verbal confirmation step gates signed transactions to defeat voice misrecognition.
- **Solana Mobile** → [docs/sponsors/solana-mobile.md](docs/sponsors/solana-mobile.md). Expo SDK 53 + RN, native Android APK, Mobile Wallet Adapter (MWA) flow. Same Privy account = same Solana address as web. dApp Store-ready.

---

## 🎙️ Voice agent tools

Eight client tools registered against the ElevenLabs agent (defined in `apps/web/components/VoiceAgent.tsx`):

| Tool | Description |
|---|---|
| `list_pools` | Returns all open pools (id, name, tournament, entry, participants). |
| `get_pool_details` | For a given pool id, returns matches, prize split, and your join status. |
| `get_user_balance` | Returns the user's USDC + SOL balance from the embedded wallet. |
| `open_pool` | Navigates the browser to `/pools/[id]` (deep-link via voice). |
| `go_to_page` | Navigates to a named page (`pools`, `admin`, `home`). |
| `preview_bridge_quote` | Calls `@lifi/sdk` for a live quote (e.g. Polygon USDC → Solana USDC) and reads back duration + fee + tool. |
| `join_pool` | Opens the Pay & Join confirm modal, awaits verbal confirmation, fires `join_polla`. |
| `submit_picks` | Submits scores for all matches; agent reads them back and only submits on verbal "yes". |

---

## 🗂️ Repo structure

```
chickenpicks-hackathon/
├── programs/chickenpicks-onchain/     # Anchor 0.31 program (Rust)
│   └── programs/chickenpicks-onchain/src/lib.rs
├── apps/
│   ├── web/                            # Next.js 15 — landing, pools, admin, voice
│   │   ├── app/pools/[id]/page.tsx     # Join + predict + claim flow
│   │   ├── components/VoiceAgent.tsx   # ElevenLabs Conv AI client
│   │   ├── components/JoinConfirmModal.tsx
│   │   └── lib/paymentMethods.ts       # Solana ✅ · LI.FI chains coming soon
│   └── mobile/                         # Expo SDK 53 — login, browse, predict, claim
├── packages/
│   ├── shared/                         # cross-app types + constants
│   └── anchor-client/                  # generated TS client + checked-in IDL
├── scripts/
│   ├── init-platform.ts                # one-shot platform init
│   ├── seed-demo-polla.ts              # creates "World Cup with Friends"
│   ├── post-results.ts                 # fake-oracle results posting
│   └── settle-polla.ts                 # admin settlement
└── docs/
    ├── SETUP.md                        # toolchain bootstrap
    └── sponsors/                       # solana / elevenlabs / lifi / solana-mobile
```

---

## ⚡ Quick start (developers)

```powershell
pnpm install
pnpm seed:demo                         # seeds the World Cup demo pool
pnpm --filter @chickenpicks/web dev    # http://localhost:3000
```

For the deeper toolchain (WSL2 + Solana CLI 2.x + Anchor 0.31 + Privy + ElevenLabs accounts + DNS), follow [docs/SETUP.md](docs/SETUP.md).

---

## ⚠️ Known limitations (hackathon scope)

- **Fake oracle** — admin manually posts match results via `/admin`. A real oracle (Pyth Pull, Switchboard, or optimistic) is post-hackathon work.
- **Settlement bounded to ~5 participants per pool** — `settle_polla` ranks all predictions in a single tx; compute-budget puts the safe ceiling around five players. Larger pools would need a chunked `settle_polla_partial`.
- **Voice agent web-only** — the mobile app uses native MWA but no voice yet.
- **Devnet program with deployer-controlled test USDC mint** — judges can be funded directly. Mainnet migration documented in [docs/sponsors/solana.md](docs/sponsors/solana.md); program code is mainnet-ready.
- **LI.FI demo via `preview_bridge_quote`** — live mainnet quotes exposed through the voice agent, but the join itself runs on the devnet program with the test USDC mint. See [docs/sponsors/lifi.md](docs/sponsors/lifi.md).

---

## 🐔 Brand

**ChickenPicks OnChain** — built for the football fan who wants their predictions on-chain without learning how Solana works.

---

## 📄 License

Source-available for hackathon judging. License TBD post-event.
