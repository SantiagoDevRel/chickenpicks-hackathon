import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          🐔 ChickenPicks <span className="text-accent">OnChain</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/pollas"
            className="text-sm text-muted hover:text-white transition"
          >
            Browse pollas
          </Link>
          <ConnectButton />
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
          Predict football. <span className="text-accent">On-chain.</span>{' '}
          By voice.
        </h1>
        <p className="mt-6 text-lg text-muted md:text-xl">
          Fully on-chain football prediction market on Solana. Cross-chain entry
          via LI.FI. Voice-native UX with ElevenLabs Conversational AI.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/pollas"
            className="rounded-lg bg-accent px-6 py-3 font-medium text-black hover:opacity-90 transition"
          >
            Browse public pollas →
          </Link>
          <a
            href="https://github.com/SantiagoDevRel/chickenpicks-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border bg-card px-6 py-3 font-medium hover:bg-border transition"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="mb-6 text-2xl font-bold">Built for Dev3pack 2026</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SponsorCard
            label="Solana"
            description="Anchor program on devnet. On-chain ranking + atomic 5% fee."
            href="https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet"
          />
          <SponsorCard
            label="LI.FI"
            description="Cross-chain USDC entry via LI.FI Widget."
          />
          <SponsorCard
            label="ElevenLabs"
            description="Conversational AI submits predictions via Privy session keys."
          />
          <SponsorCard
            label="Solana Mobile"
            description="Native Android APK via Expo + RN + MWA."
          />
        </div>
      </section>

      <footer className="mt-12 border-t border-border px-6 py-6 text-center text-xs text-muted">
        Devnet · Program{' '}
        <code className="font-mono">Cdd5…b3ut</code>
      </footer>
    </main>
  );
}

function SponsorCard({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-border bg-card p-5 transition hover:border-accent">
      <div className="mb-2 text-sm font-bold uppercase tracking-widest text-accent">
        {label}
      </div>
      <p className="text-sm text-muted">{description}</p>
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
