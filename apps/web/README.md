# @chickenpicks/web

ChickenPicks OnChain — Next.js 15 App Router. Privy phone-OTP auth + Solana embedded wallet. Reads program state from devnet.

## First run (Day 1 setup)

From the repo root:

```bash
# 1. Install workspace deps (web + shared + anchor-client)
pnpm install

# 2. Sync the IDL the Anchor build produced into the JS workspace
bash scripts/sync-idl.sh

# 3. Provide env to the Next app — it doesn't traverse upward to find .env
cd apps/web
cp ../../.env .env.local

# 4. Start the dev server
pnpm dev
```

Open http://localhost:3000

## Pages

- `/` — landing
- `/pollas` — browse public pollas (empty until at least one is created)
- `/admin` — gated to the platform authority wallet; initialize platform + (Day 2) post fake match results
- `/pollas/[id]` — TODO Day 2
- `/profile` — TODO Day 2

## Env vars

See `.env.local.example`. The minimum to log in via Privy is `NEXT_PUBLIC_PRIVY_APP_ID`.
