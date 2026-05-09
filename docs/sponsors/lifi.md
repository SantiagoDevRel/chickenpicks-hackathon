# LI.FI integration — ChickenPicks OnChain

ChickenPicks OnChain uses **`@lifi/sdk`** for cross-chain entry: a fan with USDC on Polygon / Ethereum / Arbitrum / Base / Optimism / BSC sees a live route quote (real mainnet liquidity, real numbers) inside the voice conversation before they commit.

## What ships today

| File | Role |
|---|---|
| [`apps/web/app/api/lifi/quote/route.ts`](../../apps/web/app/api/lifi/quote/route.ts) | Server endpoint that calls `getQuote` from `@lifi/sdk`. Keeps any future API key server-side. |
| [`apps/web/components/VoiceAgent.tsx`](../../apps/web/components/VoiceAgent.tsx) | `preview_bridge_quote` client tool — voice agent calls `/api/lifi/quote` and reads back duration + fee + provider. |
| [`apps/web/lib/paymentMethods.ts`](../../apps/web/lib/paymentMethods.ts) | Single source of truth for the 7 supported chains (Solana = available; the 6 EVM chains gated `comingSoon: true`). |
| [`apps/web/components/JoinConfirmModal.tsx`](../../apps/web/components/JoinConfirmModal.tsx) | The Pay & Join modal renders the multi-chain card grid with locked states + "🔒 COMING SOON · LI.FI" callouts. |
| [`apps/web/package.json`](../../apps/web/package.json) | `"@lifi/sdk": "^3.6.0"` direct dep. |

## Server endpoint shape

```ts
// apps/web/app/api/lifi/quote/route.ts (excerpt)
import { getQuote } from '@lifi/sdk';

export async function POST(req: NextRequest) {
  const { fromChain, fromAmount, fromAddress, toAddress } = await req.json();
  const SOLANA_CHAIN_ID = 1151111081099710;       // LI.FI's Solana chain id
  const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  const quote = await getQuote({
    fromChain,                                     // 137, 1, 42161, 8453, 10, 56
    toChain: SOLANA_CHAIN_ID,
    fromToken: USDC_BY_CHAIN[fromChain],
    toToken: SOLANA_USDC,
    fromAmount,
    fromAddress,
    toAddress,
    integrator: 'chickenpicks-onchain',
  });

  return NextResponse.json({
    duration_seconds: quote.estimate.executionDuration,
    gas_cost_usd: Number(quote.estimate.gasCosts?.[0]?.amountUSD ?? 0),
    bridge_fee_usd: Number(quote.estimate.feeCosts?.[0]?.amountUSD ?? 0),
    route_provider: quote.toolDetails?.name ?? quote.tool,
    to_amount_usdc: quote.estimate.toAmount,
  });
}
```

## Voice flow

The agent's `preview_bridge_quote` tool is wired to read those numbers back during the conversation. From `apps/web/components/VoiceAgent.tsx`:

```ts
preview_bridge_quote: async ({ source_chain, amount_usdc }) => {
  const r = await fetch('/api/lifi/quote', {
    method: 'POST',
    body: JSON.stringify({
      fromChain: chainNameToId(source_chain),     // alias map: 'polygon'/'matic', 'arb'/'arbitrum', …
      fromAmount: String(amount_usdc * 1_000_000),
      fromAddress: privyEmbeddedWallet.address,
      toAddress: privyEmbeddedWallet.address,    // same address on EVM and Solana via Privy
    }),
  });
  return r.json();   // agent reads "From Polygon, ~30 seconds, 5 cents in fees, via Mayan"
}
```

User says *"I have USDC on Polygon — can I use that?"* → the agent gets a real LI.FI quote in <1s and reads it back. No silent failure.

## User journey (what fans see)

1. Sign in via Privy → embedded Solana wallet appears.
2. Tap a pool → Pay & Join modal shows seven chains. Solana is the only one active *for now* — the six EVM cards display **🔒 COMING SOON · LI.FI** with an amber callout: *"Bridging is coming soon via LI.FI. Use Solana USDC for now."*
3. Talk to coach: *"What pools are open? I have USDC on Polygon — can I use it?"*. Agent reads back the live LI.FI route. User decides whether to bridge or use a Solana wallet they already have.

## ⚠️ Why preview-only on demo day

LI.FI **does not support Solana devnet or testnet** as of May 2026 — bridges only quote against mainnet liquidity ([source: LI.FI Solana docs](https://docs.li.fi/li.fi-api/solana)). Our Anchor program is on devnet for the hackathon, so:

| Step | Network | Why |
|---|---|---|
| LI.FI quote read aloud by the voice agent | **Mainnet** | Real numbers, real liquidity probe |
| `join_polla` + `submit_prediction` + `claim_prize` | **Devnet** | Hackathon contract is here |

Privy embedded wallets give the **same address** on mainnet and devnet — visual continuity holds without acrobatics. The voiceover acknowledges this honestly: *"For this demo we quote a real mainnet route to show LI.FI works, then move to our devnet program for the prediction market itself — same wallet address on both networks."*

## Why `@lifi/sdk` instead of `@lifi/widget`

We started on `@lifi/widget` and hit a transitive dependency conflict: the widget pulls a version of `@mysten/sui` that doesn't export `getJsonRpcFullnodeUrl`, breaking the Next 15 build. Pivoted to the SDK on day 2 — same routing engine, same liquidity sources, custom UI we already built. No resolver thrash, lighter bundle.

## Track requirements satisfied

- ✅ Real LI.FI integration (not just mention) — `@lifi/sdk` 3.6.x in deps + live `getQuote` call.
- ✅ Solana is the **destination** of every quote (chain id `1151111081099710`).
- ✅ `integrator: 'chickenpicks-onchain'` set so LI.FI can verify usage in their analytics.
- ✅ User-facing surface — voice + multi-chain payment grid in the Pay & Join modal.
- ✅ Repo public, contract addresses + APK link prominent in [main README](../../README.md).

## Backup if mainnet bridging fails on demo day

Record a B-roll take where the voice agent asks *"How much would it cost to bridge 5 dollars from Polygon to Solana?"* and reads the response. The reply is real even if our user doesn't actually execute the swap. Documented in [DEMO.md → Backup takes](../../DEMO.md).
