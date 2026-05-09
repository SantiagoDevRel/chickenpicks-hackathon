// MUST be imported FIRST in app/_layout.tsx, before any Solana / Anchor
// code runs. RN doesn't provide Buffer / crypto.getRandomValues / URL out
// of the box; web3.js + Anchor + spl-token rely on all three.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

// Hermes (RN's JS engine) is missing several recent JS features that
// Solana / Anchor / @noble / jose / walletconnect call at module-load or
// runtime. Polyfilling defensively up-front so we don't keep iterating
// "undefined is not a function" surprises.

// structuredClone — Node 17+ / browsers. JSON-clone works for our plain
// data shapes (no Date, function, Map, Set, circular).
if (typeof (globalThis as { structuredClone?: unknown }).structuredClone !== 'function') {
  (globalThis as { structuredClone: <T>(v: T) => T }).structuredClone = <T>(v: T): T =>
    JSON.parse(JSON.stringify(v)) as T;
}

// Promise.withResolvers — Node 22+ / Chrome 119+. Anchor 0.31's tx builder
// and several @solana/codecs internals use it.
if (typeof (Promise as unknown as { withResolvers?: () => unknown }).withResolvers !== 'function') {
  (Promise as unknown as { withResolvers: <T>() => { promise: Promise<T>; resolve: (v: T) => void; reject: (r?: unknown) => void } }).withResolvers = <T>() => {
    let resolve!: (v: T) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Object.hasOwn — Node 16+ / Chrome 93+. Used by some Anchor borsh paths.
if (typeof (Object as unknown as { hasOwn?: unknown }).hasOwn !== 'function') {
  (Object as unknown as { hasOwn: (o: object, p: PropertyKey) => boolean }).hasOwn = (o, p) =>
    Object.prototype.hasOwnProperty.call(o, p);
}

// Array.prototype.findLast / findLastIndex — Node 18+ / Chrome 97+.
type ArrayProtoFindLast = {
  findLast?: <T>(this: T[], cb: (v: T, i: number, a: T[]) => boolean) => T | undefined;
  findLastIndex?: <T>(this: T[], cb: (v: T, i: number, a: T[]) => boolean) => number;
};
const arrProto = Array.prototype as unknown as ArrayProtoFindLast;
if (typeof arrProto.findLast !== 'function') {
  arrProto.findLast = function <T>(this: T[], cb: (v: T, i: number, a: T[]) => boolean): T | undefined {
    for (let i = this.length - 1; i >= 0; i--) {
      if (cb(this[i] as T, i, this)) return this[i];
    }
    return undefined;
  };
}
if (typeof arrProto.findLastIndex !== 'function') {
  arrProto.findLastIndex = function <T>(this: T[], cb: (v: T, i: number, a: T[]) => boolean): number {
    for (let i = this.length - 1; i >= 0; i--) {
      if (cb(this[i] as T, i, this)) return i;
    }
    return -1;
  };
}

// String.prototype.replaceAll — Node 15+ / Chrome 85+. Some IDL parsers call it.
if (typeof (String.prototype as unknown as { replaceAll?: unknown }).replaceAll !== 'function') {
  (String.prototype as unknown as { replaceAll: (s: string | RegExp, r: string) => string }).replaceAll = function (
    s: string | RegExp,
    r: string,
  ) {
    if (s instanceof RegExp) return this.toString().replace(s, r);
    return this.toString().split(s).join(r);
  };
}
