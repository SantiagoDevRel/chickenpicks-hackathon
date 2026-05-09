// POST /api/lifi/quote — server-side LI.FI quote preview.
// Uses @lifi/sdk to query a real cross-chain route from the user's source
// chain to Solana USDC. Returns a digestible summary the voice agent can
// read out loud (estimated duration, fees, route provider).
//
// Body: { from_chain: number; amount?: string }
//   amount in USDC base units (6 decimals). Defaults to 1_000_000 = 1 USDC.

import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@lifi/sdk';

const USDC_BY_CHAIN: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Ethereum
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon (native USDC)
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC
};

const SOLANA_CHAIN_ID = 1151111081099710;
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // mainnet USDC

// Anonymous placeholder so getQuote works without a real wallet context.
// LI.FI accepts this for preview/pricing queries.
const PLACEHOLDER_FROM = '0x0000000000000000000000000000000000000001';
const PLACEHOLDER_TO = '11111111111111111111111111111111';

export async function POST(req: NextRequest) {
  let body: { from_chain?: number; amount?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fromChain = Number(body.from_chain);
  if (!fromChain || !USDC_BY_CHAIN[fromChain]) {
    return NextResponse.json(
      {
        supported: false,
        error: `Chain ${body.from_chain} is not supported by this preview endpoint.`,
      },
      { status: 200 },
    );
  }

  const amount = body.amount && /^\d+$/.test(body.amount) ? body.amount : '1000000';

  try {
    const quote = await getQuote({
      fromChain,
      toChain: SOLANA_CHAIN_ID,
      fromToken: USDC_BY_CHAIN[fromChain]!,
      toToken: SOLANA_USDC,
      fromAmount: amount,
      fromAddress: PLACEHOLDER_FROM,
      toAddress: PLACEHOLDER_TO,
    });

    return NextResponse.json({
      supported: true,
      duration_seconds: quote.estimate?.executionDuration ?? null,
      gas_cost_usd: quote.estimate?.gasCosts?.[0]?.amountUSD ?? null,
      bridge_fee_usd:
        quote.estimate?.feeCosts
          ?.reduce((sum, f) => sum + Number(f.amountUSD ?? 0), 0)
          ?.toFixed(2) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      route_provider: (quote as any).toolDetails?.name ?? quote.tool ?? 'LI.FI',
      to_amount_usdc: quote.estimate?.toAmount
        ? Number(quote.estimate.toAmount) / 1_000_000
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        supported: false,
        error:
          (e as Error).message ??
          'Failed to fetch route — chain may not have a viable USDC->Solana path right now.',
      },
      { status: 200 },
    );
  }
}
