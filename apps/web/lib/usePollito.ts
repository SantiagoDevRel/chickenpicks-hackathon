'use client';

import { useEffect, useState } from 'react';
import {
  POLLITOS,
  getPollito,
  randomPollitoId,
  pollitoImage,
  type Pollito,
} from './pollitos';

const STORAGE_KEY = 'chickenpicks:pollito';

export function usePollito(): {
  pollito: Pollito;
  pollitoId: string | null;
  setPollitoId: (id: string) => void;
  ready: boolean;
  hasChosen: boolean;
} {
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setId(stored);
    setReady(true);
  }, []);

  function setPollitoId(newId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, newId);
    setId(newId);
  }

  return {
    pollito: getPollito(id ?? POLLITOS[0]!.id),
    pollitoId: id,
    setPollitoId,
    ready,
    hasChosen: id !== null,
  };
}

export { POLLITOS, getPollito, randomPollitoId, pollitoImage };
