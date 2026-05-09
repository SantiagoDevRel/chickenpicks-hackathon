// MUST be imported FIRST in app/_layout.tsx, before any Solana / Anchor
// code runs. RN doesn't provide Buffer / crypto.getRandomValues / URL out
// of the box; web3.js + Anchor + spl-token rely on all three.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;
