# ChickenPicks OnChain

Fully on-chain football prediction market on Solana. Voice-native UX. Cross-chain entry.
Built for **Dev3pack Global Hackathon** (May 2026).

🌐 **Live demo**: https://onchain.chickenpicks.app *(deploys after submission)*
📺 **Demo video**: *<YouTube link — added Day 4>*
📱 **Android APK**: *<release link — also on Solana dApp Store>*

---

## Contract addresses (Solana devnet)

| Account | Address |
|---|---|
| Program ID | `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut` |
| Platform Treasury | `76QkvEWDpRW3PnLVz2wctcFJm9dAsXquHTEkwSxxq31H` |
| USDC mint (devnet) | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |

---

## What it does

1. **Sign up by phone** — Privy creates an embedded Solana wallet under the hood (custodial). One wallet across web, mobile, and voice.
2. **Browse public pollas** (prediction pools). Each has an entry amount in USDC, prize distribution, and a list of matches.
3. **Bridge USDC from any chain** via the LI.FI widget — destination is USDC-Solana.
4. **Join a polla** by paying entry in USDC. Funds go into a program-owned vault PDA.
5. **Predict scores** for every match. Predictions are public on-chain but locked once the first match result is posted.
6. **Voice agent (web)** — talk to ElevenLabs Conversational AI. It can list pollas, describe matches, check your balance, and submit predictions via a Privy session key (no wallet popup).
7. **Admin posts fake match results** (hackathon oracle).
8. **Anyone triggers `settle_polla`** — atomic on-chain ranking using the la-polla scoring rule (5/3/2/0). 5% platform fee paid to treasury in the same tx; remaining 95% allocated to top predictors per the polla's prize distribution.
9. **Winners claim** via `claim_prize` (strict signer check).

ChickenPicks OnChain is a **separate product** from the production app at https://chickenpicks.app — that one keeps running off-chain in Spanish for its existing user base.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        On-chain (source of truth)                    │
│                  Solana devnet · Anchor program                      │
│  PlatformConfig · Polla · Match · Prediction · Vault (USDC ATA)     │
└──────────▲────────────────────────────▲─────────────────▲───────────┘
           │ join/predict/claim         │ settle/score    │ admin
           │ (Privy wallet sign)        │ (any wallet)    │ (treasury wallet)
┌──────────┴───────────┐    ┌───────────┴────────────┐    ┌┴──────────┐
│   apps/web (Next.js) │    │   apps/mobile (Expo)   │    │ /admin UI │
│ Privy + LI.FI Widget │    │   Privy RN + MWA       │    │ fake oracle│
│ ElevenLabs Conv AI   │    │   Native Android APK   │    └───────────┘
└──────────────────────┘    └────────────────────────┘
```

**Source of truth on-chain**: pollas, vault, predictions, match results, settlement, commission. **Off-chain only**: UI rendering, Privy auth, ElevenLabs API, mobile app shell, admin oracle UI. **No Supabase. Wallet = identity.**

---

## Sponsor integrations

- **Solana** → [docs/sponsors/solana.md](docs/sponsors/solana.md) — Anchor program, on-chain ranking, atomic 5% fee
- **LI.FI** → [docs/sponsors/lifi.md](docs/sponsors/lifi.md) — cross-chain USDC entry via widget
- **ElevenLabs** → [docs/sponsors/elevenlabs.md](docs/sponsors/elevenlabs.md) — voice agent submits predictions via Privy session keys
- **Solana Mobile** → [docs/sponsors/solana-mobile.md](docs/sponsors/solana-mobile.md) — Expo + RN + MWA, native APK, dApp Store submission

---

## Repo structure

```
chickenpicks-hackathon/
├── programs/chickenpicks-onchain/    # Anchor program (Rust)
├── apps/web/                          # Next.js 15 — landing + pollas + admin + voice
├── apps/mobile/                       # Expo SDK 53 — login, browse, predict, claim
├── packages/shared/                   # cross-app types + constants
├── packages/anchor-client/            # generated TS client + checked-in IDL
├── scripts/                           # seed-demo-data, post-fake-result, airdrop helpers
└── docs/                              # SETUP.md, architecture, per-sponsor docs
```

---

## Local development

**First time?** Read [docs/SETUP.md](docs/SETUP.md) — covers Node 20, pnpm, WSL2 + Solana toolchain, Privy/ElevenLabs accounts, devnet keypairs, Vercel + DNS.

Once setup is done:

```powershell
# Install JS deps (host: Windows)
pnpm install

# Build everything
pnpm build

# Run web app
pnpm --filter @chickenpicks/web dev    # http://localhost:3000

# Run mobile app
pnpm --filter @chickenpicks/mobile start

# Anchor (inside WSL)
cd ~/chickenpicks-hackathon/programs/chickenpicks-onchain
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

---

## Demo data seeding

After Anchor deploy + `initialize_platform`:

```bash
pnpm --filter scripts seed-demo-data
```

Creates 3 fake pollas × 5 funded test users × predictions, ready to record the demo.

---

## Known limitations (hackathon scope)

- **Fake oracle** — admin posts match results manually via `/admin` UI. Real oracle (Pyth Pull, Switchboard, or optimistic) is post-hackathon.
- **Settlement bounded to ~5 participants per polla** — the `settle_polla` ix scores all predictions on-chain in one tx. Larger pollas would need `settle_polla_partial` chunking.
- **Voice agent on web only** — mobile voice button is post-hackathon.
- **Devnet only** — no mainnet deploy. LI.FI bridge in demo may use mainnet with $1 amounts (R1 fallback).
- **English only** — no Spanish in OnChain UI. The production app at chickenpicks.app keeps Spanish.

---

## License

Source-available for hackathon judging. License TBD post-event.
