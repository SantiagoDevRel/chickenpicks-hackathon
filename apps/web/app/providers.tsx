'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { PollitoPickerModal } from '@/components/PollitoPickerModal';

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-amber-300">
        <h1 className="text-2xl font-bold mb-4">Missing config</h1>
        <p>
          <code>NEXT_PUBLIC_PRIVY_APP_ID</code> is not set. Copy{' '}
          <code>.env.local.example</code> to <code>.env.local</code> and fill in your
          Privy app ID, then restart <code>pnpm dev</code>.
        </p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Email is the primary login (works globally including Latam where
        // SMS is region-blocked). SMS stays as a fallback for demo regions
        // where it does work. Both create the same embedded Solana wallet.
        loginMethods: ['email', 'sms'],
        appearance: {
          theme: 'dark',
          accentColor: '#FFD700',
          logo: undefined,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'users-without-wallets' },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        solanaClusters: [
          { name: 'devnet', rpcUrl: SOLANA_RPC },
        ],
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <PollitoPickerModal />
      </QueryClientProvider>
    </PrivyProvider>
  );
}
