// Shared formatting helpers, ported from apps/web inline implementations.
import { BN } from '@coral-xyz/anchor';
import { USDC_DECIMALS } from './constants';

export function formatUsdc(raw: BN): string {
  const denom = new BN(10).pow(new BN(USDC_DECIMALS));
  const whole = raw.div(denom).toString();
  const frac = raw
    .mod(denom)
    .toString()
    .padStart(USDC_DECIMALS, '0')
    .slice(0, 2);
  return `${whole}.${frac}`;
}

export function statusKey(status: {
  open?: object;
  locked?: object;
  settled?: object;
}): 'OPEN' | 'LOCKED' | 'SETTLED' {
  if ('open' in status) return 'OPEN';
  if ('locked' in status) return 'LOCKED';
  return 'SETTLED';
}
