'use client';

import Link from 'next/link';
import { ConnectButton } from './ConnectButton';
import { pollitoImage, usePollito } from '@/lib/usePollito';

// Sticky brand header — wordmark in tricolor (gold/amber/turf), the user's
// chosen pollito on the left (defaults to pibe-líder before they pick).
// Mirrors la-polla's BrandHeader so the visual identity reads identical
// across both products.

export function BrandHeader() {
  const { pollito } = usePollito();
  return (
    <header
      className="sticky top-0 z-40 px-4 pt-3 pb-2 backdrop-blur-md"
      style={{ background: 'rgba(8, 12, 16, 0.85)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link href="/inicio" className="flex items-center gap-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pollitoImage(pollito, 'lider')}
            alt={pollito.label}
            width={36}
            height={36}
            style={{ objectFit: 'contain' }}
            className="transition-transform group-hover:scale-105"
          />
          <span
            className="font-display leading-none tracking-[0.04em] flex items-baseline gap-[5px]"
            style={{
              fontSize: 18,
              textShadow: '0 2px 6px rgba(0,0,0,0.55)',
            }}
          >
            <span style={{ color: '#FFD700' }}>CHICKEN</span>
            <span style={{ color: '#FF9F1C' }}>PICKS</span>
            <span style={{ color: '#1FD87F' }}>ONCHAIN</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          {/* Primary nav lives in <BottomNav /> (mobile bottom bar / desktop top
              rail). This header keeps just the wallet pill + an admin link
              when applicable. */}
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
