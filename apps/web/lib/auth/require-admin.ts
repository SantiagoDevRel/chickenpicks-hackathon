// Server-side helper for /api/admin/* routes.
//
// Replaces the previous (insecure) `x-admin-email` header check with a real
// Privy server-side verification:
//   1. Read `Authorization: Bearer <privy_access_token>` from the request.
//   2. Verify the token with `verifyAuthToken()` — this proves the caller
//      currently holds a valid session for our Privy app. The token is signed
//      by Privy with our app's keypair and cannot be forged client-side.
//   3. Look up the verified user's email via `getUserById()` and check it
//      against the ADMIN_EMAILS allowlist (`isAdminEmail`).
//
// Returns either a verified `{ userId, email }` pair on success, or a
// `NextResponse` (401/403) that the caller should return as-is.

import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { isAdminEmail } from '@/lib/server-admin';

let _privyClient: PrivyClient | null = null;
function getPrivyClient(): PrivyClient {
  if (_privyClient) return _privyClient;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      'Missing Privy server credentials: set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET',
    );
  }
  _privyClient = new PrivyClient(appId, appSecret);
  return _privyClient;
}

export type AdminContext = {
  userId: string;
  email: string;
};

/**
 * Verify the incoming request carries a valid Privy access token AND that
 * the verified user's email is in the admin allowlist.
 *
 * Returns `{ ok: true, ctx }` on success, or `{ ok: false, response }` with a
 * pre-built `NextResponse` (401/403/500) that the route should return.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing or malformed Authorization header (expected Bearer token).' },
        { status: 401 },
      ),
    };
  }
  const token = authHeader.slice('bearer '.length).trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Empty bearer token.' },
        { status: 401 },
      ),
    };
  }

  let privy: PrivyClient;
  try {
    privy = getPrivyClient();
  } catch (e) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: (e as Error).message },
        { status: 500 },
      ),
    };
  }

  let userId: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    userId = claims.userId;
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid or expired auth token.' },
        { status: 401 },
      ),
    };
  }

  let email: string | undefined;
  try {
    const user = await privy.getUserById(userId);
    email = user.email?.address;
    // Privy users can link email via OAuth (google/apple/etc) without a
    // dedicated `email` linked account. Fall back to those.
    if (!email) {
      email =
        user.google?.email ??
        user.apple?.email ??
        user.linkedin?.email ??
        user.github?.email ??
        undefined;
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Failed to load user profile from Privy.' },
        { status: 500 },
      ),
    };
  }

  if (!email || !isAdminEmail(email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Not authorized — admin email mismatch.' },
        { status: 403 },
      ),
    };
  }

  return { ok: true, ctx: { userId, email } };
}
