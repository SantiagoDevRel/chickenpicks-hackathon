// Payment methods catalogue for the join-pool flow.
// AVAILABLE = the integration ships today (Solana USDC direct).
// COMING SOON = the integration is built (LI.FI Widget) but full
// end-to-end requires mainnet deploy, which is a post-hackathon decision.
//
// Both the visual modal and the voice agent use this catalogue:
// - Modal: AVAILABLE methods are clickable, others are greyed with a label.
// - Voice agent: the agent's system prompt enumerates what's available so
//   it apologises politely when the user names a non-available method.

export type PaymentMethod = {
  id: string;
  /** Short label for the modal card (e.g. "USDC"). */
  label: string;
  /** Chain badge ("Solana", "Polygon", "Ethereum"). */
  chainName: string;
  /** One-line tagline rendered under the label. */
  description: string;
  /** Whether the integration is live today. False = "coming soon". */
  available: boolean;
  /** Aliases the agent might hear ("solana"/"sol", "polygon"/"matic", etc). */
  voiceAliases: string[];
  /** Emoji or single character for the card icon. */
  icon: string;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'solana',
    label: 'USDC',
    chainName: 'Solana',
    description: 'Directly from your Solana wallet balance',
    available: true,
    voiceAliases: ['solana', 'sol', 'devnet', 'mainnet'],
    icon: '◎',
  },
  {
    id: 'polygon',
    label: 'USDC',
    chainName: 'Polygon',
    description: 'Bridge via LI.FI · Coming soon',
    available: false,
    voiceAliases: ['polygon', 'matic', 'pol'],
    icon: '⬡',
  },
  {
    id: 'ethereum',
    label: 'USDC',
    chainName: 'Ethereum',
    description: 'Bridge via LI.FI · Coming soon',
    available: false,
    voiceAliases: ['ethereum', 'eth', 'mainnet', 'L1'],
    icon: 'Ξ',
  },
  {
    id: 'arbitrum',
    label: 'USDC',
    chainName: 'Arbitrum',
    description: 'Bridge via LI.FI · Coming soon',
    available: false,
    voiceAliases: ['arbitrum', 'arb'],
    icon: '◉',
  },
  {
    id: 'base',
    label: 'USDC',
    chainName: 'Base',
    description: 'Bridge via LI.FI · Coming soon',
    available: false,
    voiceAliases: ['base'],
    icon: '🟦',
  },
  {
    id: 'optimism',
    label: 'USDC',
    chainName: 'Optimism',
    description: 'Bridge via LI.FI · Coming soon',
    available: false,
    voiceAliases: ['optimism', 'op'],
    icon: '🔴',
  },
];

export function getPaymentMethod(id: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export function findPaymentByVoiceAlias(
  spoken: string,
): PaymentMethod | undefined {
  const normalized = spoken.toLowerCase().trim();
  return PAYMENT_METHODS.find((m) =>
    m.voiceAliases.some((a) => normalized.includes(a)),
  );
}
