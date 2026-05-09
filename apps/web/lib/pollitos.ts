// Pollito (chicken character) catalog — used for the post-signup picker,
// the BrandHeader logo, the ConnectButton dropdown, and the polla hero card.
// Each entry maps to webp assets in /public/pollitos/.
//
// `voiceId` is reserved for the future "agent speaks in your pollito's voice"
// feature — left as a TODO until ElevenLabs Conversational AI supports
// per-session voice override at signed-URL time.

export type Pollito = {
  id: string;
  label: string;
  // Vibe one-liner shown in the picker.
  vibe: string;
  // Filename prefix for /pollitos/<prefix>_lider.webp etc.
  imagePrefix: string;
  // Future: ElevenLabs voice library ID for the agent to speak in this voice.
  voiceId?: string;
};

export const POLLITOS: Pollito[] = [
  {
    id: 'pibe',
    label: 'El Pibe',
    vibe: 'Young, fast, never stops talking',
    imagePrefix: 'pollito_pibe',
  },
  {
    id: 'capitan',
    label: 'El Capitán',
    vibe: 'Veteran. Tactical. Plays the long game',
    imagePrefix: 'pollito_capitan',
  },
  {
    id: 'goleador',
    label: 'El Goleador',
    vibe: 'Lives for the back of the net',
    imagePrefix: 'pollito_goleador',
  },
  {
    id: 'arquero',
    label: 'El Arquero',
    vibe: 'Cold-blooded. Reads the play three steps ahead',
    imagePrefix: 'pollito_arquero',
  },
  {
    id: 'gambeteador',
    label: 'El Gambeteador',
    vibe: 'Trickster. Picks the chaos branches',
    imagePrefix: 'pollito_gambeteador',
  },
  {
    id: 'paisa',
    label: 'El Paisa',
    vibe: 'Warm, loud, never lets you forget you owe him a beer',
    imagePrefix: 'pollito_paisa',
  },
  {
    id: 'costeno',
    label: 'El Costeño',
    vibe: 'Caribbean energy. Shows up at every match',
    imagePrefix: 'pollito_costeno',
  },
  {
    id: 'rolo',
    label: 'El Rolo',
    vibe: 'Bogotá refined. Always reads the form',
    imagePrefix: 'pollito_rolo',
  },
  {
    id: 'rasta',
    label: 'El Rasta',
    vibe: 'Vibes only. Predicts with the universe',
    imagePrefix: 'pollito_rasta',
  },
  {
    id: 'tigre',
    label: 'El Tigre',
    vibe: 'Aggressive. Always picks the upset',
    imagePrefix: 'pollito_tigre',
  },
  {
    id: 'negro',
    label: 'El Negro',
    vibe: 'Steady. Picks the underdog and means it',
    imagePrefix: 'pollito_negro',
  },
  {
    id: 'verde',
    label: 'El Verde',
    vibe: 'Lucky charm. Wins by vibes, not stats',
    imagePrefix: 'pollito_verde',
  },
];

export function getPollito(id: string | null | undefined): Pollito {
  return POLLITOS.find((p) => p.id === id) ?? POLLITOS[0]!;
}

/**
 * Random pollito for users who skip the picker. Stable per page load
 * (we re-roll only when there's no localStorage entry).
 */
export function randomPollitoId(): string {
  return POLLITOS[Math.floor(Math.random() * POLLITOS.length)]!.id;
}

export function pollitoImage(
  pollito: Pollito,
  variant: 'base' | 'lider' | 'peleando' | 'triste' = 'lider',
): string {
  return `/pollitos/${pollito.imagePrefix}_${variant}.webp`;
}
