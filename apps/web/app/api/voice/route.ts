// /api/voice — server-side mint of an ElevenLabs Conversational AI signed URL.
//
// Keeps ELEVENLABS_API_KEY on the server. Browser POSTs here, gets back a
// short-lived signed_url + agentId; opens a WebSocket directly to ElevenLabs
// using those creds.

import { NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

export async function POST() {
  if (!API_KEY || !AGENT_ID) {
    return NextResponse.json(
      {
        error:
          'ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID is not set in apps/web/.env.local.',
      },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(AGENT_ID)}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': API_KEY },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs API ${res.status}: ${txt}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { signed_url?: string };
    if (!data.signed_url) {
      return NextResponse.json(
        { error: 'ElevenLabs returned no signed_url' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId: AGENT_ID,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
