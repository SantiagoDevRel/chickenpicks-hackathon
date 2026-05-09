# Demo script — ChickenPicks OnChain (3:00)

**The pitch in one breath:** Latin Americans bet ~USD 25B/year on football and lose 10-20% to centralized rake — when the books pay out at all. ChickenPicks rebuilds that market on Solana so every pool is an Anchor program, every prediction is a public on-chain account, and the only key that can drain a winner's slice is the winner's. We made it voice-native because football fans don't want a wallet UI mid-conversation with their friends.

**Three minutes, one take.** The voice agent does the heavy lifting; the camera follows the screen and the Solana Explorer. Every signed transaction we show in the demo lands on devnet under program [`Cdd53o33...3ut`](https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet) — judges can replay each tx in Explorer using the links the agent surfaces.

**Sponsor visibility checkpoints** (each on-camera at least once):
- **Solana** — program addresses pinned, `settle_polla` tx in Explorer with the atomic 5% fee transfer visible inside the same instruction.
- **LI.FI** — voice agent reads back a live `@lifi/sdk` quote with real numbers (duration, fee, route provider); Pay & Join modal shows the multi-chain payment cards.
- **ElevenLabs** — voice agent end-to-end (list → navigate → quote bridge → join → predict) inside one continuous conversation.
- **Solana Mobile** — native Android APK from the dApp Store, MWA flow, **same Solana address as web** (proves Privy embedded wallet is deterministic across surfaces).

---

## 0:00–0:20 · Hook + landing

**Screen**: `https://onchain.chickenpicks.app/` landing. Tricolor wordmark visible. Sponsor logos along the bottom strip (Solana, LI.FI, ElevenLabs, Solana Mobile).

**Voiceover** (lead with the problem, not the stack):
> "Latin Americans bet 25 billion dollars a year on football and lose up to 20% to the house — when the house pays at all. ChickenPicks puts every pool on Solana — atomic payout, no rake-pulling, no withdrawal reviews. Three minutes, end to end."

**On-chain**: contract addresses card visible — Program `Cdd5...b3ut`, demo pool `36MP...wPZj`. Solana Explorer link clickable.

---

## 0:20–0:50 · Login → embedded wallet → /pools

**Screen direction**: click **Sign in** → modal pops → enter email → 6-digit OTP → in 2 seconds we're at `/pools` with one open pool: **"World Cup with Friends"**.

**Voiceover**:
> "I sign in with email — Privy mints me a Solana wallet behind the scenes. No seed phrase, no extension. There's one open pool — World Cup with Friends, one USDC entry, three matches, prize split fifty thirty twenty."

**On-chain**: fresh wallet address visible in header (e.g. `9o8J…45wK`) — balance pill shows live SOL + USDC.

---

## 0:50–1:20 · Voice agent: discover → quote bridge → join

**Screen direction**: click the floating **🎙️ Talk to Coach** button. Conversation overlay opens.

**Conversation**:
- User: *"What pools are open?"*
- Agent (calls `list_pools`): "There's one open pool — World Cup with Friends, one USDC to enter, three matches."
- User: *"Open it."*
- Agent (calls `open_pool`): page navigates to `/pools/36MP...wPZj`.
- User: *"I have USDC on Polygon — can I use that?"*
- Agent (calls `preview_bridge_quote`): "From Polygon a bridge would take about thirty seconds, cost five cents in fees, routed via Mayan. For now I can take USDC directly on Solana — want to use that?"
- User: *"Yes."*
- Agent (calls `join_pool` → modal opens with payment cards: Solana USDC active, Polygon / Ethereum / Arbitrum / Base / Optimism / BSC marked **🔒 Coming soon · LI.FI**): "Confirm one USDC entry from your Solana wallet?"
- User: *"Confirm."*

**On-chain**: `join_polla` tx fires. Solana Explorer link drops in the agent panel. Pool participant counter ticks +1.

---

## 1:20–1:50 · Voice agent: predict scores

**Conversation**:
- User: *"My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two."*
- Agent (calls `submit_picks`, reads back): "I heard Argentina two Brazil one, Spain one France one, Germany zero Italy two. Submit?"
- User: *"Yes, submit."*

**On-chain**: `submit_prediction` tx fires; Solana Explorer link visible. Predictions card on the page now shows the three submitted scorelines with the user's wallet address.

---

## 1:50–2:20 · Admin posts results + settles

**Screen direction**: open a second tab, sign in as admin (`santiagodevrel1@gmail.com`), navigate to `/admin`. The same demo pool is listed.

**Voice/text overlay**:
> "Switching to the admin role. The hackathon oracle is a button — in production this would be Pyth Pull or Switchboard."

**Action**: click **POST 2-1**, **POST 1-1**, **POST 0-2** for the three matches. Then click **SETTLE POOL**.

**On-chain**: `settle_polla` tx fires. **Inside the same tx**: 5% fee lands in the treasury ATA, ranks computed on-chain via la-polla scoring (5/3/2/0), `final_rank` written to each `Prediction` account. Explorer link visible — judges can see the fee transfer + rank writes in one transaction.

---

## 2:20–2:40 · Claim

**Screen direction**: switch back to the user tab → `/pools/36MP...wPZj` now shows **"YOU RANKED #1"** + **CLAIM** button.

**Voiceover**:
> "Back as the user — I ranked first. Claim transfers point-nine-five USDC to my embedded wallet. Strict-signer check on-chain — only my pubkey can pull this slice. Even the treasury can't touch it."

**Action**: click **CLAIM**. `claim_prize` tx fires. Wallet balance updates (after the 5% platform fee already taken at settlement).

**On-chain**: `claim_prize` Explorer link.

---

## 2:40–3:00 · Mobile + outro

**Screen direction**: cut to phone screencast. Open the **ChickenPicks OnChain** Android APK. Same email login → **same Solana address** → `/pools` browse → tap "🎙 TALK TO COACH" (voice works on mobile too via WebView embed) → MWA prompt for sign → join completes.

**Voiceover**:
> "Same account, same wallet, native mobile via Solana Mobile's wallet adapter. Voice agent ports to Android too. Built for Dev3pack — Solana, LI.FI, ElevenLabs, Solana Mobile, all four tracks, one product. The only key that can pull a winner's prize is the winner's."

**Outro card** (held 4 seconds):
- Sponsor logos: Solana / LI.FI / ElevenLabs / Solana Mobile
- Repo: `github.com/SantiagoDevRel/chickenpicks-hackathon`
- Program: `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut`
- URL: `onchain.chickenpicks.app`
- APK: `expo.dev/artifacts/eas/hiiDZNqcQ88hvHxT6nVWqt.apk`

---

## Backup takes (record before the live take)

- **B-roll: LI.FI mainnet quote** — open `/pools/[id]` while signed in, voice prompt *"How much would it cost to bridge from Polygon?"*, capture the quote read-back. Fallback if the live `preview_bridge_quote` fails.
- **B-roll: settle on a 3-participant pool** — funded with three test users via `scripts/fund-user.ts`, settled in advance. Cut to this if compute-budget makes the live single-tx settle nervous.
- **B-roll: anchor test happy-path output** — `anchor test` running through the full 8-ix flow with assertions printed. Fallback if any live tx hangs on devnet RPC.
- **Audio backup** — record the voiceover script as a separate WAV in case live mic captures wind/noise.

---

## "Must do" checklist before recording

- [ ] User wallet has SOL + USDC on devnet (`9o8JhoSME1fFt5X5Jj9cYDSuY2SXiTBbASDf9SP545wK` already at 0.1 SOL + 10 USDC)
- [ ] Demo pool is OPEN (not settled from previous practice run) — re-seed if needed: `pnpm seed:demo`
- [ ] Voice agent system prompt updated with verbal-confirm gate (see `docs/sponsors/elevenlabs.md`)
- [ ] Vercel deploy is green at `onchain.chickenpicks.app`
- [ ] APK installed on the demo Android with email already remembered
- [ ] Browser windows arranged: user tab + admin tab + Solana Explorer side panel
- [ ] Mic-test pass on the recording device (no wind, no echo)
- [ ] Tabs muted except the one being recorded (avoid voice-agent autoplay collisions)
