// MUST be imported FIRST in app/_layout.tsx, before any Solana / Anchor
// code runs. RN doesn't provide Buffer / crypto.getRandomValues / URL out
// of the box; web3.js + Anchor + spl-token rely on all three.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

// Hermes (RN's JS engine) does not implement structuredClone — but several
// libraries (jose, @noble, walletconnect, etc.) call it unconditionally at
// import time and the whole module load fails. JSON-clone works for our
// plain-object payloads (no Date, no functions, no circular refs).
if (typeof (globalThis as { structuredClone?: unknown }).structuredClone !== 'function') {
  (globalThis as { structuredClone: <T>(v: T) => T }).structuredClone = <T>(v: T): T =>
    JSON.parse(JSON.stringify(v)) as T;
}
