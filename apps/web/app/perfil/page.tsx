'use client';

// /perfil — user profile, mobile-first, mirrors la-polla.
//
// Sections:
//   - Hero: pollito avatar + display-name input (editable) + email/phone
//   - "Cuenta para cobrar" — wallet pubkey + copy button (replaces la-polla's bank info,
//     since on-chain payouts hit your Solana wallet directly)
//   - Idioma — Español/English toggle (UI-only for now)
//   - Tamaño del texto — -30% / 100% / +60% (UI-only accessibility placeholder)
//   - "Panel de administración" button if user is admin
//   - "Cerrar sesión" red text, calls Privy logout
//
// All persistence is localStorage for the hackathon — DB-side profile sync
// is a follow-up.

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import {
  POLLITOS,
  pollitoImage,
  usePollito,
  type Pollito,
} from '@/lib/usePollito';

// Demo allow-list for the admin pill until we have a real /api/me endpoint
// that returns the server-side ADMIN_EMAILS check.
const FALLBACK_ADMIN_EMAILS = new Set([
  'santiagodevrel1@gmail.com',
  'santiagotrujillozuluaga@gmail.com',
]);

const NAME_KEY = 'chickenpicks:displayName';
const LANG_KEY = 'chickenpicks:lang';
const TEXTSIZE_KEY = 'chickenpicks:textSize';

type Lang = 'es' | 'en';
type TextSize = '-30' | '100' | '+60';

export default function PerfilPage() {
  const { ready, authenticated, user, logout, login } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0]?.address ?? null;

  const { pollito, setPollitoId } = usePollito();
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [lang, setLang] = useState<Lang>('es');
  const [textSize, setTextSize] = useState<TextSize>('100');
  const [copied, setCopied] = useState(false);

  // Load persisted settings on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setName(window.localStorage.getItem(NAME_KEY) ?? '');
    const l = window.localStorage.getItem(LANG_KEY);
    if (l === 'es' || l === 'en') setLang(l);
    const t = window.localStorage.getItem(TEXTSIZE_KEY);
    if (t === '-30' || t === '100' || t === '+60') setTextSize(t);
  }, []);

  function saveName() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NAME_KEY, name.trim());
    setEditingName(false);
  }

  function saveLang(v: Lang) {
    setLang(v);
    if (typeof window !== 'undefined') window.localStorage.setItem(LANG_KEY, v);
  }

  function saveTextSize(v: TextSize) {
    setTextSize(v);
    if (typeof window !== 'undefined') window.localStorage.setItem(TEXTSIZE_KEY, v);
  }

  function copyWallet() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const email = user?.email?.address ?? null;
  const phone = user?.phone?.number ?? null;
  const isAdmin = email ? FALLBACK_ADMIN_EMAILS.has(email.toLowerCase()) : false;

  if (ready && !authenticated) {
    return (
      <main className="min-h-screen pb-28">
        <BrandHeader />
        <div className="mx-auto max-w-md px-4 pt-6 text-center">
          <h1 className="font-display tracking-[0.04em] text-3xl text-text-primary uppercase">
            Sign in to view your profile
          </h1>
          <button
            onClick={login}
            className="mt-6 rounded-md bg-gold px-6 py-3 font-display tracking-[0.08em] text-sm text-black hover:bg-amber transition"
          >
            SIGN IN
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28">
      <BrandHeader />

      <div className="mx-auto max-w-2xl px-4 pt-4">
        <h1 className="font-display tracking-[0.04em] text-2xl md:text-3xl text-text-primary uppercase mb-5 text-center">
          My profile
        </h1>

        {/* Hero: pollito + name + contact */}
        <section className="lp-card-hero p-5 mb-5 text-center">
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="relative inline-block group"
            aria-label="Change avatar"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pollitoImage(pollito, 'lider')}
              alt={pollito.label}
              width={104}
              height={104}
              className="drop-shadow-[0_8px_28px_rgba(255,215,0,0.25)] group-hover:scale-105 transition"
            />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-black border-2 border-bg-card">
              <PencilIcon />
            </span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-2">
            {editingName ? (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                  className="rounded-md bg-bg-base/60 border border-border-default px-3 py-1.5 text-center font-display tracking-[0.04em] text-lg text-text-primary focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveName}
                  className="rounded-md bg-gold px-3 py-1.5 font-display tracking-[0.08em] text-xs text-black hover:bg-amber transition"
                >
                  SAVE
                </button>
              </>
            ) : (
              <>
                <span className="font-display tracking-[0.04em] text-xl text-text-primary uppercase">
                  {name || (email?.split('@')[0] ?? 'Player')}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="rounded-md border border-border-default bg-bg-card/40 px-2.5 py-1 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition"
                >
                  EDIT
                </button>
              </>
            )}
          </div>

          {(email || phone) && (
            <div className="mt-2 text-sm text-text-muted space-y-0.5">
              {email && <div>{email}</div>}
              {phone && <div>{phone}</div>}
            </div>
          )}
        </section>

        {/* Payout account */}
        <Section label="Payout account">
          <div className="lp-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <SolanaIcon />
              <span className="font-display tracking-[0.06em] text-xs text-text-muted uppercase">
                Solana wallet · Devnet
              </span>
            </div>
            <button
              type="button"
              onClick={copyWallet}
              disabled={!wallet}
              className="mt-2 w-full text-left rounded-md bg-bg-base/60 border border-border-subtle p-2.5 hover:border-border-default transition disabled:opacity-50"
            >
              <div className="font-mono text-xs text-text-secondary break-all leading-relaxed">
                {wallet ?? '—'}
              </div>
              <div className="mt-1.5 text-xs font-display tracking-[0.08em] text-text-muted">
                {copied ? (
                  <span className="text-turf">COPIED ✓</span>
                ) : (
                  'TAP TO COPY'
                )}
              </div>
            </button>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Pool prizes are sent directly to this wallet — no intermediaries,
              no delays.
            </p>
          </div>
        </Section>

        {/* Admin pill */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-6 block rounded-md border-2 border-gold/50 bg-gold/[0.05] px-5 py-3.5 text-center font-display tracking-[0.08em] text-sm text-gold uppercase hover:bg-gold/10 transition"
          >
            Admin panel
          </Link>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={() => logout()}
          className="mt-6 w-full py-3 text-center font-display tracking-[0.08em] text-sm text-red-alert hover:underline transition uppercase border border-red-alert/30 rounded-md hover:bg-red-alert/5"
        >
          Sign out
        </button>
      </div>

      {showPicker && (
        <PollitoPicker
          current={pollito}
          onPick={(id) => {
            setPollitoId(id);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </main>
  );
}

function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="px-1 mb-2 font-display tracking-[0.08em] text-[11px] text-gold uppercase">
        ▸ {label}
      </h2>
      {children}
    </section>
  );
}

function SegButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md py-2.5 font-display tracking-[0.04em] text-[13px] transition ${
        active
          ? 'bg-gold text-black shadow-[0_4px_18px_-6px_rgba(255,215,0,0.4)]'
          : 'border border-border-default bg-bg-base/40 text-text-secondary hover:border-border-strong'
      }`}
    >
      {label}
    </button>
  );
}

function PollitoPicker({
  current,
  onPick,
  onClose,
}: {
  current: Pollito;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="lp-card-hero max-w-md w-full p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-display tracking-[0.04em] text-xl text-gold uppercase">
            Elige tu pollito
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-default px-2.5 py-1 font-display tracking-[0.08em] text-[10px] text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {POLLITOS.map((p) => {
            const active = p.id === current.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id)}
                className={`rounded-md p-2 transition ${
                  active
                    ? 'border-2 border-gold bg-gold/10'
                    : 'border border-border-subtle bg-bg-base/40 hover:border-gold'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pollitoImage(p, 'lider')}
                  alt={p.label}
                  width={64}
                  height={64}
                  className="mx-auto"
                />
                <div className="mt-1 font-display tracking-[0.04em] text-[10px] text-text-secondary uppercase truncate text-center">
                  {p.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4l11-11-4-4L4 16v4z"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SolanaIcon() {
  // simplified Solana mark
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7l3-3h11l-3 3H5zM5 13l3-3h11l-3 3H5zM5 19l3-3h11l-3 3H5z"
        stroke="rgb(var(--gold-rgb))"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
