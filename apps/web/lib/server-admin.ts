// Server-side helpers for /api/admin/* routes.
//
// - Reads the deployer keypair from keys/deployer.json (dev) or
//   DEPLOYER_KEYPAIR_JSON env (prod/Vercel).
// - Provides isAdminEmail() that checks against ADMIN_EMAILS allowlist.
// - The Anchor program client gets a Wallet wrapping the deployer keypair so
//   server endpoints can sign + send instructions on behalf of the platform
//   authority.

import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import { SOLANA_RPC_URL } from '@chickenpicks/shared';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

let _deployerCache: Keypair | null = null;
function loadDeployer(): Keypair {
  if (_deployerCache) return _deployerCache;
  const env = process.env.DEPLOYER_KEYPAIR_JSON;
  if (env && env.trim()) {
    const parsed = JSON.parse(env);
    _deployerCache = Keypair.fromSecretKey(Uint8Array.from(parsed));
    return _deployerCache;
  }
  // Fallback: read from local keys/deployer.json (dev only)
  const candidates = [
    path.resolve(process.cwd(), '../../keys/deployer.json'),
    path.resolve(process.cwd(), '../keys/deployer.json'),
    path.resolve(process.cwd(), 'keys/deployer.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const bytes = JSON.parse(fs.readFileSync(p, 'utf8'));
      _deployerCache = Keypair.fromSecretKey(Uint8Array.from(bytes));
      return _deployerCache;
    }
  }
  throw new Error(
    'Deployer keypair not found. Set DEPLOYER_KEYPAIR_JSON env var or place keys/deployer.json at the repo root.',
  );
}

export function getAdminProgram(): {
  program: Program;
  deployer: Keypair;
  connection: Connection;
} {
  const deployer = loadDeployer();
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, new Wallet(deployer), {
    commitment: 'confirmed',
  });
  const program = new Program(idl as Idl, provider);
  return { program, deployer, connection };
}
