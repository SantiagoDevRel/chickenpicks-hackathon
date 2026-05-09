// Standalone page that hosts ONLY the ElevenLabs Conversational AI widget.
// Loaded inside a <WebView> in the mobile app so the voice agent works on
// Android too, without us having to port the @elevenlabs/react SDK to RN.
//
// Returned as a raw HTML response (Route Handler) so we control the full
// document and don't inherit the root layout / providers from /app.

export const dynamic = 'force-dynamic';

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID ?? '';

export function GET() {
  if (!AGENT_ID) {
    return new Response(
      '<h1>Missing ELEVENLABS_AGENT_ID</h1><p>Set it in Vercel env vars and redeploy.</p>',
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <title>ChickenPicks Coach</title>
    <style>
      html, body { margin: 0; padding: 0; background: #080C10; color: #F5F7FA;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        height: 100%; overflow: hidden; -webkit-tap-highlight-color: transparent; }
      .frame { min-height: 100vh; display: flex; flex-direction: column;
        align-items: stretch; justify-content: flex-end; padding: 24px;
        box-sizing: border-box; }
      .header { text-align: center; margin-bottom: 32px; }
      .header h1 { font-size: 26px; letter-spacing: 0.05em;
        margin: 0 0 8px; color: #FFD700; font-weight: 800; text-transform: uppercase; }
      .header p { margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.4; }
      .widget-host { display: flex; justify-content: center; align-items: center; flex: 1; }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="header">
        <h1>ChickenPicks Coach</h1>
        <p>Tap the mic, ask anything about pools, picks, or the platform.</p>
      </div>
      <div class="widget-host">
        <elevenlabs-convai agent-id="${AGENT_ID}"></elevenlabs-convai>
      </div>
    </div>
    <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Allow WebView mic perms — the Permissions-Policy header would block
      // microphone in iframes; here we want to permit it.
      'Permissions-Policy': 'microphone=(self)',
    },
  });
}
