'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  POLLITOS,
  pollitoImage,
  randomPollitoId,
  usePollito,
  type Pollito,
} from '@/lib/usePollito';

/**
 * Shows a modal on first login asking the user to pick their chicken
 * character. If they skip, we assign a random one. The choice is stored
 * in localStorage and used everywhere a pollito appears (header, hero,
 * dropdown). Mounted once at the layout level.
 */
export function PollitoPickerModal() {
  const { ready: privyReady, authenticated } = usePrivy();
  const { pollitoId, setPollitoId, ready: pollitoReady } = usePollito();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<Pollito | null>(POLLITOS[0]!);

  useEffect(() => {
    if (!privyReady || !pollitoReady) return;
    // Open exactly once: when the user is signed in and hasn't picked yet
    if (authenticated && pollitoId === null) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [privyReady, pollitoReady, authenticated, pollitoId]);

  function pick(p: Pollito) {
    setPollitoId(p.id);
    setOpen(false);
  }

  function pickRandom() {
    setPollitoId(randomPollitoId());
    setOpen(false);
  }

  if (!open) return null;

  const focused = hover ?? POLLITOS[0]!;

  return (
    <div className="fixed inset-0 z-[55] bg-black/85 backdrop-blur flex items-center justify-center p-4 animate-fade-in">
      <div className="lp-card-hero max-w-3xl w-full p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display tracking-[0.04em] text-2xl text-gold uppercase leading-none">
              Pick your chicken
            </h2>
            <p className="text-xs text-text-muted mt-2">
              Each chicken has its own vibe. You can change it later in your
              profile.
            </p>
          </div>
          <button
            onClick={pickRandom}
            className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-3 py-1.5 font-display tracking-[0.08em] text-[10px] text-text-muted hover:text-text-primary hover:border-border-strong transition"
          >
            🎲 RANDOM
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-[1fr_220px] gap-5">
          {/* Grid of pollitos */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {POLLITOS.map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p)}
                onMouseEnter={() => setHover(p)}
                onFocus={() => setHover(p)}
                className="rounded-md bg-bg-base/50 border border-border-subtle p-2 hover:border-gold transition group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pollitoImage(p, 'lider')}
                  alt={p.label}
                  width={72}
                  height={72}
                  className="mx-auto transition-transform group-hover:scale-110"
                />
                <div className="mt-1 text-center font-display tracking-[0.04em] text-[10px] text-text-secondary uppercase truncate">
                  {p.label}
                </div>
              </button>
            ))}
          </div>

          {/* Focused pollito detail panel */}
          <div className="hidden md:flex flex-col items-center justify-center text-center bg-bg-base/40 rounded-md p-4 border border-border-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pollitoImage(focused, 'lider')}
              alt={focused.label}
              width={140}
              height={140}
              className="mb-3 drop-shadow-[0_8px_28px_rgba(255,215,0,0.25)]"
            />
            <div className="font-display tracking-[0.04em] text-lg text-gold uppercase">
              {focused.label}
            </div>
            <div className="text-xs text-text-muted mt-2 leading-relaxed">
              {focused.vibe}
            </div>
            <button
              onClick={() => pick(focused)}
              className="mt-4 w-full rounded-md bg-gold px-4 py-2 font-display tracking-[0.08em] text-xs text-black hover:bg-amber transition"
            >
              PICK THIS ONE
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-display tracking-[0.08em] text-text-muted">
          PURELY COSMETIC · YOUR PICKS RIDE ON YOUR SCORES, NOT YOUR CHICKEN
        </p>
      </div>
    </div>
  );
}
