# ElevenLabs integration — ChickenPicks OnChain

ChickenPicks ships an **end-to-end voice flow**: a user can discover, navigate, fetch a cross-chain quote, join, and predict without touching the keyboard. The voice agent is the primary UX, not a gimmick. It works on **both web and Android** — the mobile app embeds the same agent inside a `WebView` so the integration covers two surfaces.

## Where it lives

| File | Role |
|---|---|
| [`apps/web/components/VoiceAgent.tsx`](../../apps/web/components/VoiceAgent.tsx) | Main agent component using `@elevenlabs/react`'s `useConversation`. 9 client tools registered. |
| [`apps/web/components/PersistentVoiceAgent.tsx`](../../apps/web/components/PersistentVoiceAgent.tsx) | One-mount wrapper in providers — the agent survives `router.push` between screens. |
| [`apps/web/lib/VoiceContext.tsx`](../../apps/web/lib/VoiceContext.tsx) | React Context for pages to register their `onVoiceJoinPool` / `onVoiceSubmitPicks` callbacks. |
| [`apps/web/app/api/voice/route.ts`](../../apps/web/app/api/voice/route.ts) | Server endpoint that mints a short-lived `signed_url` via `@elevenlabs/client`. **API key never reaches the browser.** |
| [`apps/web/app/voice-embed/route.ts`](../../apps/web/app/voice-embed/route.ts) | Standalone HTML page hosting the official `@elevenlabs/convai-widget-embed` — used by the mobile WebView. |
| [`apps/mobile/components/VoiceCoachModal.tsx`](../../apps/mobile/components/VoiceCoachModal.tsx) | Full-screen Modal + `<WebView>` wrapping `/voice-embed`. Mic permissions auto-granted on Android. |

## Server-side API key (defense-in-depth)

The browser **never sees** `ELEVENLABS_API_KEY`. Flow:

1. Client calls `GET /api/voice` (no body).
2. Server reads `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID` from env.
3. Server requests `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=...` with the API key in headers.
4. Server returns `{ signedUrl, agentId }` to the client.
5. Client passes `signedUrl` to `useConversation` and starts the WebSocket session.

The signed URL is valid for ~10 minutes and tied to the agent — leaking it doesn't compromise the API key.

## Nine client tools

Read tools call the Anchor program directly via a read-only `AnchorProvider`; mutating tools surface a confirm modal in the parent page and only fire after **verbal AND modal** confirmation.

| Tool | Type | What it does |
|---|---|---|
| `list_pools` | read | `program.account.polla.all()`, filtered by configured USDC mint. Returns id, name, tournament, entry, participants. (Alias `list_pollas` kept for back-compat.) |
| `get_pool_details` | read | Loads one polla + its matches + the user's join status. |
| `get_current_pool` | read | Returns the pool currently open in the user's browser tab (via dynamic variable). |
| `get_user_balance` | read | Reads embedded wallet's USDC ATA + SOL balance. |
| `open_pool` | nav | `router.push('/pools/[id]')`. Voice deep-linking. **Fuzzy-matches by name** if the input isn't a pubkey. |
| `go_to_page` | nav | Maps named pages (`pools`, `admin`, `home`, `profile`). |
| `preview_bridge_quote` | read | Calls `@lifi/sdk` for a live cross-chain USDC quote and returns duration, fee, and provider name. |
| `join_pool` | mutate | Triggers the Pay & Join modal; awaits verbal confirm; fires `join_polla` from the embedded wallet. |
| `submit_picks` | mutate | Reads picks back to the user; on verbal "yes" submits `submit_prediction`. |

## Verbal-confirmation gate

Voice misrecognition is a real failure mode. Every signed tx is gated:

1. The agent reads the action back: *"I heard Argentina two Brazil one — submit?"*
2. The user must say **yes** before the modal fires the tx.

This is enforced in code: the `submit_picks` and `join_pool` resolvers accept a `verballyConfirmed: boolean` flag, and short-circuit if false. From [`apps/web/components/VoiceAgent.tsx`](../../apps/web/components/VoiceAgent.tsx):

```ts
submit_picks: async ({ scores, verbally_confirmed }) => {
  if (!verbally_confirmed) {
    return { ok: false, error: 'Please confirm verbally before I submit.' };
  }
  if (!callbacks.onVoiceSubmitPicks) {
    return { ok: false, error: 'Open a pool first so I know where to submit.' };
  }
  return callbacks.onVoiceSubmitPicks(scores, verbally_confirmed);
}
```

## Voice on Android (WebView embed)

Porting `@elevenlabs/react` to React Native means re-implementing the WebRTC + audio pipeline. Instead, we ship a **standalone HTML page** at [`apps/web/app/voice-embed/route.ts`](../../apps/web/app/voice-embed/route.ts) that renders only the official ElevenLabs widget script:

```html
<elevenlabs-convai agent-id="<AGENT_ID>"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async></script>
```

The mobile app loads that page in a `<WebView>` ([`VoiceCoachModal.tsx`](../../apps/mobile/components/VoiceCoachModal.tsx)) with mic permissions auto-granted. **Same agent, same tools, same conversation history — two platforms.** The Android `Permissions-Policy: microphone=(self)` header is set on the route so the WebView passes the audio capture check.

## System prompt (high level)

The agent is hosted in the ElevenLabs dashboard. The system prompt enforces these invariants — paste-ready, edit in your dashboard:

> You are **ChickenPicks Coach**, a voice assistant for an on-chain football prediction market on Solana.
>
> **Always do these things:**
> 1. Speak conversationally. Read every monetary amount, duration, or score back to the user before any signing action.
> 2. Before calling `join_pool` or `submit_picks`, confirm verbally: *"I heard X — should I submit?"*. **Only call those tools with `verbally_confirmed: true` after the user explicitly says yes.**
> 3. When asked about funding, call `get_user_balance` first; never assume a balance.
> 4. When asked about pools, call `list_pools` (or `get_pool_details` if a specific pool is named).
> 5. When asked about cross-chain bridging, call `preview_bridge_quote` and read back the duration / fee / provider exactly.
> 6. If a tool returns an error, explain it conversationally and offer a fallback ("I couldn't reach that pool — want me to list open pools instead?").
> 7. Keep replies under 2 sentences unless the user asks for detail.
>
> **Never:**
> - Make up scores, balances, or quotes.
> - Sign or submit without verbal confirmation.
> - Reveal Solana addresses, transaction signatures, or seed material aloud unless the user asks specifically.

Dynamic variables passed at `startSession`: `current_pool_id`, `on_pool_page`, `is_signed_in`. The agent uses these to scope `get_current_pool` etc. without an extra round-trip.

## Demo flow (also in [DEMO.md](../../DEMO.md))

> *"What pools are open?"* → *"Open it."* → *"I have USDC on Polygon, can I use that?"* → quote read back → *"Yes."* → join → *"My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two."* → confirmed → submitted.

Every step on-chain. Every step inside one ElevenLabs conversation. Every signed tx visible in Solana Explorer with the link surfaced in the agent panel.

## Two demo voice prompts that exercise the most impressive tools

1. **Cross-chain + on-chain in one breath** (3 sponsors visible in 25 seconds):
    > *"What pools are open?"* → *"Open World Cup with Friends."* → *"I have USDC on Polygon, what would a bridge cost?"* → (agent quotes real LI.FI numbers via `preview_bridge_quote`) → *"Use Solana directly, join now."*
    Hits `list_pools`, `open_pool`, `preview_bridge_quote`, `join_pool`.

2. **Picks-by-voice with the misrecognition gate** (proves the safety mechanism is real, not theater):
    > *"My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two."* → (agent reads back) → *"Yes, submit."* → tx fires.
    Forces `submit_picks` with the verbal-confirm gate visibly on screen.

## Track requirements satisfied

- ✅ Real ElevenLabs Conv AI agent in their dashboard with rich tool set (9 tools).
- ✅ Voice is the **primary UX**, not a bolt-on — both web and mobile demos show end-to-end flows.
- ✅ API key kept server-side via signed URL pattern.
- ✅ Verbal-confirm gate documented and enforced in code.
- ✅ Voice on **two platforms** (web native + mobile via WebView embed).
- ✅ Tools call real on-chain logic — `join_pool` and `submit_picks` produce visible Solana transactions.
