'use client';

import Link from 'next/link';
import { ConnectButton } from './ConnectButton';

// Sticky brand header — wordmark in tricolor (gold/amber/turf), pibe líder
// chicken on the left. Mirrors la-polla's BrandHeader so the visual identity
// reads identical across both products.

export function BrandHeader() {
  return (
    <header
      className="sticky top-0 z-40 px-4 pt-4 pb-3 backdrop-blur-md"
      style={{ background: 'rgba(8, 12, 16, 0.85)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pollitos/pollito_pibe_lider.webp"
            alt=""
            width={44}
            height={44}
            style={{ objectFit: 'contain' }}
            className="transition-transform group-hover:scale-105"
          />
          <span
            className="font-display leading-none tracking-[0.04em] flex items-baseline gap-[5px]"
            style={{
              fontSize: 22,
              textShadow: '0 2px 6px rgba(0,0,0,0.55)',
            }}
          >
            <span style={{ color: '#FFD700' }}>CHICKEN</span>
            <span style={{ color: '#FF9F1C' }}>PICKS</span>
            <span style={{ color: '#1FD87F' }}>ONCHAIN</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/pollas"
            className="hidden md:inline-block font-display tracking-[0.08em] text-[14px] text-text-secondary hover:text-text-primary transition"
          >
            POOLS
          </Link>
          <Link
            href="/admin"
            className="hidden md:inline-block font-display tracking-[0.08em] text-[14px] text-text-secondary hover:text-text-primary transition"
          >
            ADMIN
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
