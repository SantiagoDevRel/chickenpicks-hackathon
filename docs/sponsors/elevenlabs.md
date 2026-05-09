# ElevenLabs integration

ChickenPicks OnChain ships an end-to-end voice flow: a user can **discover, navigate, join, and predict** without touching the keyboard. The voice agent is the primary UX, not a gimmick.

## Where it lives

- **Component**: `apps/web/components/VoiceAgent.tsx`
- **SDK**: `@elevenlabs/react` (`useConversation` hook).
- **Server**: a Next.js route mints a signed connect URL via `@elevenlabs/client` so the API key never reaches the browser.
- **Agent**: hosted in the ElevenLabs dashboard (Conversational AI). System prompt enforces "always confirm before signing."

## Eight client tools

The agent is registered with the eight tools below. Read-only tools call the Anchor program directly via a read-only `AnchorProvider`; mutating tools surface a confirm modal in the parent page and only fire after verbal **and** modal confirmation.

| Tool | Type | What it does |
|---|---|---|
| `list_pools` | read | `program.account.polla.all()`, filtered by configured USDC mint. Returns id, name, tournament, entry, participants. |
| `get_pool_details` | read | Loads one polla + its matches + the user's join status. |
| `get_user_balance` | read | Reads embedded wallet's USDC ATA + SOL balance. |
| `open_pool` | nav | `router.push('/pools/[id]')`. Voice deep-linking. |
| `go_to_page` | nav | Maps named pages (`pools`, `admin`, `home`). |
| `preview_bridge_quote` | read | Calls `@lifi/sdk` for a live cross-chain USDC quote and returns duration, fee, and tool name. |
| `join_pool` | mutate | Triggers the Pay & Join modal; awaits verbal confirm; fires `join_polla` from the embedded wallet. |
| `submit_picks` | mutate | Reads picks back to the user; on verbal "yes" submits `submit_prediction`. |

## Verbal-confirmation gate

Voice misrecognition is a real failure mode. Every signed tx is gated twice:

1. The agent reads the action back: *"I heard Argentina two Brazil one — submit?"*
2. The user must say **yes** before the modal fires the tx.

This is enforced in code: the `submit_picks` and `join_pool` tools accept a `verballyConfirmed: boolean` flag, and the resolver short-circuits if false.

## Why it works for ChickenPicks

Football fans don't want a wallet UI mid-conversation with friends. The voice agent collapses what would otherwise be 4–5 clicks (browse → select → enter scores × N → confirm) into one continuous spoken interaction. The Privy embedded wallet means there's no pop-up to break the flow — sign happens silently in the background once the user said "yes."

## Demo flow (also in [DEMO.md](../../DEMO.md))

> "What pools are open?" → "Open it." → "I have USDC on Polygon, can I use that?" → quote read back → "Yes." → join → "My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two." → confirmed → submitted.

Every step on-chain. Every step inside one ElevenLabs conversation.
