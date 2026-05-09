# Demo script — ChickenPicks OnChain (3:00)

Three minutes, one take. The voice agent does the heavy lifting; the camera follows the screen and the on-chain explorer.

Sponsor visibility checkpoints (must each be on-camera at least once):
- **Solana** — program addresses pinned, `settle_polla` tx in Explorer, atomic 5 % fee transfer.
- **LI.FI** — voice agent reads back a live `@lifi/sdk` quote with real numbers, Pay & Join modal showing the multi-chain payment cards.
- **ElevenLabs** — voice agent end-to-end (list, navigate, join, predict).
- **Solana Mobile** — native APK, MWA flow, same Solana address as web.

---

## 0:00–0:20 · Hook + landing

**Screen**: `https://onchain.chickenpicks.app/` landing. Tricolor wordmark visible. Sponsor logos along the bottom strip (Solana, LI.FI, ElevenLabs, Solana Mobile).

**Voiceover**:
> "ChickenPicks OnChain. Football prediction pools on Solana. Phone login, embedded wallet, and a voice agent that handles the cross-chain mess for you. Three minutes, end-to-end."

**On-chain**: contract addresses card visible — Program `Cdd5...b3ut`, Pool `36MP...wPZj`.

---

## 0:20–0:50 · Login → embedded wallet → /pools

**Screen direction**: click **Sign in** → modal pops → enter email → 6-digit OTP → in 2 seconds we're at `/pools` with one open pool: **"World Cup with Friends"**.

**Voiceover**:
> "I sign in with email — Privy mints me a Solana wallet behind the scenes. No seed phrase, no extension. There's one open pool: World Cup with Friends, one USDC entry, three matches, prize split fifty thirty twenty."

**On-chain**: fresh wallet address visible in header (e.g. `4xT...9Hq`). Pool card showing entry amount + match list pulled live from the Anchor program.

---

## 0:50–1:20 · Voice agent: discover → quote bridge → join

**Screen direction**: click the floating **🎙️ Talk to Coach** button. Conversation overlay opens.

**Conversation**:
- User: "What pools are open?"
- Agent (calls `list_pools`): "There's one open pool — World Cup with Friends, one USDC to enter, three matches."
- User: "Open it."
- Agent (calls `open_pool`): page navigates to `/pools/36MP...wPZj`.
- User: "I have USDC on Polygon — can I use that?"
- Agent (calls `preview_bridge_quote`): "From Polygon a bridge would take about thirty seconds, cost five cents in fees, routed via Mayan. For now I can take USDC directly on Solana — want to use that?"
- User: "Yes."
- Agent (calls `join_pool` → modal opens with payment cards: Solana USDC active, Polygon / Ethereum / Arbitrum / Base / Optimism marked **Coming soon · LI.FI**): "Confirm one USDC entry from your Solana wallet?"
- User: "Confirm."

**On-chain**: `join_polla` tx fires. Solana Explorer link drops in the agent panel. Pool participant counter ticks +1.

---

## 1:20–1:50 · Voice agent: predict scores

**Conversation**:
- User: "My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two."
- Agent (calls `submit_picks` → reads back): "I heard Argentina two Brazil one, Spain one France one, Germany zero Italy two. Submit?"
- User: "Yes."

**On-chain**: `submit_prediction` tx fires; Solana Explorer link visible. Predictions card on the page now shows the three submitted scorelines with the user's wallet address.

---

## 1:50–2:20 · Admin posts results + settles

**Screen direction**: open a second tab, sign in as admin (`santiagodevrel1@gmail.com`), navigate to `/admin`. The same demo pool is listed.

**Voice/text overlay**:
> "Switching to the admin role. The hackathon oracle is a button — in production this would be Pyth Pull or Switchboard."

**Action**: click **POST 2-1**, **POST 1-1**, **POST 0-2** for the three matches. Then click **SETTLE POOL**.

**On-chain**: `settle_polla` tx fires. Inside the same tx: 5 % fee (0.05 USDC × 1 participant in this minimal demo, 0.15 if 3 players joined) lands in the treasury ATA, ranks computed on-chain, winner pubkeys + amounts written to the pool account. Explorer link visible.

---

## 2:20–2:40 · Claim

**Screen direction**: switch back to the user tab → `/pools/36MP...wPZj` now shows **"YOU RANKED #1"** + **CLAIM** button.

**Voiceover**:
> "Back as the user — I ranked first. Claim transfers ninety-five hundredths USDC to my embedded wallet. Strict-signer check on-chain — only my pubkey can pull this slice."

**Action**: click **CLAIM**. `claim_prize` tx fires. Wallet balance updates from 0 to **0.95 USDC** (after the 5 % platform fee already taken at settlement).

**On-chain**: `claim_prize` Explorer link.

---

## 2:40–3:00 · Mobile + outro

**Screen direction**: cut to phone screencast. Open the **ChickenPicks OnChain** Android APK. Same email login → same Solana address → `/pools` browse → tap the demo pool → MWA prompt for sign → join completes.

**Voiceover**:
> "Same account, same wallet, native mobile via Solana Mobile's wallet adapter. Built for Dev3pack — Solana, LI.FI, ElevenLabs, Solana Mobile, all four tracks, one product."

**Outro card** (held 4 seconds):
- Sponsor logos: Solana / LI.FI / ElevenLabs / Solana Mobile
- Repo: `github.com/SantiagoDevRel/chickenpicks-hackathon`
- Program: `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut`
- URL: `onchain.chickenpicks.app`

---

## Backup takes (record before the live take)

- **B-roll: LI.FI Widget on mainnet** — open the widget on a separate page, preview a real Polygon→Solana USDC route, close without signing. Available as cutaway if `preview_bridge_quote` fails live.
- **B-roll: settle on a 3-participant pool** — funded with three test users via `scripts/fund-user.ts`, settled in advance. Cut to this if compute-budget makes the live single-tx settle nervous.
- **Audio backup** — record the voiceover script as a separate WAV in case live mic captures wind/noise.
