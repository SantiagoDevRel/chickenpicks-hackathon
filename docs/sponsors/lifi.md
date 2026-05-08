# LI.FI integration

ChickenPicks OnChain uses the LI.FI Widget for cross-chain entry: bridge USDC from any supported chain → USDC on Solana → join a polla.

## Where it lives

`apps/web/components/LifiBridge.tsx` — a React component wrapping `@lifi/widget`. Mounted on the polla detail page (`/pollas/[id]`) behind a "Top up" CTA when the user's USDC balance is below the polla's `entry_amount`.

## Configuration

```tsx
import { LiFiWidget, WidgetConfig } from '@lifi/widget';

const config: WidgetConfig = {
  toChain: 1151111081099710, // Solana ChainId.SOL
  toToken: 'USDC',           // resolved by symbol on the destination chain
  integrator: 'chickenpicks-onchain',
  appearance: 'dark',
};

export function LifiBridge() {
  return <LiFiWidget config={config} integrator="chickenpicks-onchain" />;
}
```

## User journey

1. User logs in via Privy (phone OTP) and gets an embedded Solana wallet.
2. Clicks "Join polla" → app detects USDC balance < entry → opens LI.FI Widget.
3. User selects source chain (Polygon, Arbitrum, Optimism, etc.) and source token (USDC, ETH, …).
4. LI.FI quotes routes (Mayan, CCTP for native USDC, Wormhole for general).
5. User signs source-chain tx with the connected EVM wallet (or signs a Solana tx for SOL→Sol routes).
6. Widget tracks the cross-chain transfer; once USDC lands on Solana, user closes the widget.
7. App refreshes the on-chain USDC balance and unlocks the "Join polla" button.

## ⚠️ Verified Day 0: mainnet-only on Solana

The LI.FI Widget **does not support Solana devnet or testnet** as of May 2026. There is no documented way to override the destination chain to `devnet` and still get valid routes — bridges only quote against mainnet liquidity.

Sources:
- [Configure Widget — LI.FI Documentation](https://docs.li.fi/widget/configure-widget)
- [LI.FI Expands to Solana](https://li.fi/knowledge-hub/li-fi-expands-to-solana/)
- [Solana | LI.FI Documentation](https://docs.li.fi/li.fi-api/solana)

### Demo strategy under this constraint

The demo splits into two independent on-chain flows:

| Step | Network | Why |
|---|---|---|
| LI.FI bridge demonstration | Mainnet (small amount, e.g. $1 USDC from Polygon → Solana) | Required to actually exercise the widget |
| Polla join + predict + settle + claim | **Devnet** (our Anchor program is deployed here) | Hackathon contract deployment is devnet-only |

The voiceover in the demo acknowledges this scope cleanly: "*For this demo we bridge real USDC on mainnet to show the widget, then move to our devnet program for the prediction market itself — both flows use the same Privy wallet address.*"

Privy embedded wallets give the same address on mainnet and devnet, so the visual continuity holds.

### Fallback if mainnet bridging fails on demo day

Record a backup take where the bridge step is shown via the LI.FI Widget UI but not actually executed (close the widget after route preview). Document this in [DEMO.md](../../DEMO.md) as the contingency.

## Track requirements satisfied

- ✅ LI.FI Widget integrated as the primary cross-chain entry point
- ✅ Solana is the core destination of the journey
- ✅ Repo public, contract addresses prominent in main README
