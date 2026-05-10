// POST /api/lifi/quotes-all — fetch LI.FI quotes for SEVERAL EVM mainnets
// to Solana mainnet USDC in parallel. Used by the voice agent's bridge
// quote popup so the user sees variety (Polygon, Arbitrum, Base, Optimism)
// instead of a single chain. The actual demo collapses back to "USDC on
// Solana devnet" via a CTA in the popup — these quotes are read-only
// previews to prove the LI.FI integration is wired to live data.
//
// Body: { amount?: string }  — amount in USDC base units (6 decimals).
// Default = 1_000_000 (1 USDC).
//
// Response: { quotes: [{ chain_id, chain_label, ...quote_fields }] }

import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@lifi/sdk';

type ChainEntry = {
  id: number;
  label: string;
  usdc: string;
};

// Curated set — chains with reliable USDC->Solana paths via LI.FI.
const CHAINS: ChainEntry[] = [
  { id: 137, label: 'Polygon', usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  { id: 42161, label: 'Arbitrum', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  { id: 8453, label: 'Base', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { id: 10, label: 'Optimism', usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
];

const SOLANA_CHAIN_ID = 1151111081099710;
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PLACEHOLDER_FROM = '0x0000000000000000000000000000000000000001';
const PLACEHOLDER_TO = '11111111111111111111111111111111';

type QuoteRow = {
  chain_id: number;
  chain_label: string;
  ok: boolean;
  duration_seconds: number | null;
  bridge_fee_usd: number | null;
  gas_cost_usd: number | null;
  route_provider: string | null;
  to_amount_usdc: number | null;
  error?: string;
};

async function quoteOne(chain: ChainEntry, amount: string): Promise<QuoteRow> {
  try {
    const q = await getQuote({
      fromChain: chain.id,
      toChain: SOLANA_CHAIN_ID,
      fromToken: chain.usdc,
      toToken: SOLANA_USDC,
      fromAmount: amount,
      fromAddress: PLACEHOLDER_FROM,
      toAddress: PLACEHOLDER_TO,
    });
    const feeUsd = q.estimate?.feeCosts?.reduce(
      (s, f) => s + Number(f.amountUSD ?? 0),
      0,
    );
    const gasUsd = q.estimate?.gasCosts?.reduce(
      (s, g) => s + Number(g.amountUSD ?? 0),
      0,
    );
    return {
      chain_id: chain.id,
      chain_label: chain.label,
      ok: true,
      duration_seconds: q.estimate?.executionDuration ?? null,
      bridge_fee_usd: typeof feeUsd === 'number' ? Number(feeUsd.toFixed(2)) : null,
      gas_cost_usd: typeof gasUsd === 'number' ? Number(gasUsd.toFixed(2)) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      route_provider: (q as any).toolDetails?.name ?? q.tool ?? 'LI.FI',
      to_amount_usdc: q.estimate?.toAmount
        ? Number(q.estimate.toAmount) / 1_000_000
        : null,
    };
  } catch (e) {
    return {
      chain_id: chain.id,
      chain_label: chain.label,
      ok: false,
      duration_seconds: null,
      bridge_fee_usd: null,
      gas_cost_usd: null,
      route_provider: null,
      to_amount_usdc: null,
      error: (e as Error).message,
    };
  }
}

export async function POST(req: NextRequest) {
  let body: { amount?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const amount = body.amount && /^\d+$/.test(body.amount) ? body.amount : '1000000';

  // Parallel fan-out — LI.FI rate-limits per-chain so 4 requests at once is fine.
  const quotes = await Promise.all(CHAINS.map((c) => quoteOne(c, amount)));

  return NextResponse.json({
    amount_usdc: Number(amount) / 1_000_000,
    to_chain_label: 'Solana',
    quotes,
  });
}
