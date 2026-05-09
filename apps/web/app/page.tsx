import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { NavVoiceMount } from '@/components/NavVoiceMount';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <BrandHeader />
      <NavVoiceMount />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pollitos/pollito_capitan_lider.webp"
            alt=""
            width={140}
            height={140}
            className="mb-6 drop-shadow-[0_8px_28px_rgba(255,215,0,0.25)]"
          />

          <h1
            className="font-display leading-[0.95] tracking-[0.02em] text-[44px] md:text-[88px] uppercase"
            style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}
          >
            <span className="text-text-primary">Predict football.</span>
            <br />
            <span className="text-gold">On-chain.</span>{' '}
            <span className="text-amber">By voice.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-text-secondary text-base md:text-lg">
            Fully on-chain football prediction market on Solana. Cross-chain entry
            via LI.FI. Voice-native UX with ElevenLabs Conversational AI.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pollas"
              className="rounded-md bg-gold px-6 py-3 font-display tracking-[0.08em] text-sm text-black hover:bg-amber transition"
            >
              BROWSE POLLAS →
            </Link>
            <a
              href="https://github.com/SantiagoDevRel/chickenpicks-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-6 py-3 font-display tracking-[0.08em] text-sm text-text-primary hover:border-border-strong transition"
            >
              GITHUB
            </a>
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="lp-section-title mb-6 text-center">Built for Dev3pack 2026</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SponsorCard
            chicken="/pollitos/pollito_dim_lider.webp"
            label="Solana"
            description="Anchor program on devnet. On-chain ranking + atomic 5% fee. Trustless settlement, strict signer claims."
            href="https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet"
            color="#FFD700"
          />
          <SponsorCard
            chicken="/pollitos/pollito_gambeteador_lider.webp"
            label="LI.FI"
            description="Cross-chain USDC entry via LI.FI Widget. Bridge from any chain into Solana, then join a polla."
            color="#FF9F1C"
          />
          <SponsorCard
            chicken="/pollitos/pollito_arbitro_lider.webp"
            label="ElevenLabs"
            description="Conversational AI submits predictions via Privy session keys. No wallet popup, just talk."
            color="#1FD87F"
          />
          <SponsorCard
            chicken="/pollitos/pollito_pibe_lider.webp"
            label="Solana Mobile"
            description="Native Android APK via Expo + RN + MWA. Submitted to the Solana dApp Store."
            color="#FF3D57"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-12 px-4 py-8 text-center text-xs text-text-muted">
        <div className="font-display tracking-[0.08em]">
          DEVNET · PROGRAM <code className="font-mono normal-case tracking-normal">Cdd5…b3ut</code>
        </div>
        <div className="mt-2 text-[11px]">
          Production app at{' '}
          <a
            href="https://chickenpicks.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            chickenpicks.app
          </a>{' '}
          · OnChain version at onchain.chickenpicks.app
        </div>
      </footer>
    </main>
  );
}

function SponsorCard({
  chicken,
  label,
  description,
  href,
  color,
}: {
  chicken: string;
  label: string;
  description: string;
  href?: string;
  color: string;
}) {
  const inner = (
    <div className="lp-card p-5 transition hover:border-border-strong h-full">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={chicken}
          alt=""
          width={64}
          height={64}
          className="flex-shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        />
        <div className="flex-1">
          <div
            className="font-display tracking-[0.08em] text-[13px] mb-1"
            style={{ color }}
          >
            {label.toUpperCase()}
          </div>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}
