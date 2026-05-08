import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Outfit } from 'next/font/google';
import { Providers } from './providers';
import { AppBackground } from '@/components/AppBackground';
import './globals.css';

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ChickenPicks OnChain',
  description:
    'Fully on-chain football prediction market on Solana. Voice-native UX. Cross-chain entry.',
};

export const viewport: Viewport = {
  themeColor: '#FFD700',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${outfit.variable} dark`}>
      <body className="antialiased">
        <AppBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
