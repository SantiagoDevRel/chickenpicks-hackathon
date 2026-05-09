# Demo script — ChickenPicks OnChain (3:00)

**The pitch in one breath:** Latin Americans bet ~USD 25B/year on football and lose 10-20% to centralized rake — when the books pay out at all. ChickenPicks rebuilds that market on Solana so every pool is an Anchor program, every prediction is a public on-chain account, and the only key that can drain a winner's slice is the winner's. We made it voice-native because football fans don't want a wallet UI mid-conversation with their friends.

**Three minutes, scripted but on-chain.** Every signed transaction lands on devnet under program [`Cdd53o33...3ut`](https://explorer.solana.com/address/Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut?cluster=devnet) — judges can replay each tx in Explorer using the links the agent surfaces.

---

## The "rigged" demo, honestly

> **Real-world tradeoff:** building a 3-min demo around random outcomes is a coin flip — half the time the user loses and the demo is awkward. So we **pre-script the OUTCOMES** (we choose 3 fake users + their predictions, and we choose what the match results will be). That way the user wins on stage. Everything is still **on-chain real** — same Anchor program, same `settle_polla` math, same `claim_prize`. We just author the narrative.
>
> Concretely:
> - Fake users: 3 wallets we fund and sign for (`scripts/seed-demo-polla.ts` already does this).
> - Their picks: we write known-bad picks so the demo user finishes #1.
> - Match results: we control the admin oracle (it's literally `set_match_result` from `/admin`); we type in scores that match the demo user's prediction.
> - Settle + claim: 100% real on-chain calls.

This is consistent with how Solana hackathon demos are scored: judges look at the **on-chain receipts**, not whether the predictions were random.

---

## Setup before recording (10 minutes)

```bash
# 1. Re-seed a fresh demo pool with 3 fake users + their picks
pnpm seed:demo

# 2. Capture the new pool's pubkey from the script output. Update DEMO.md
#    Outro card if needed.

# 3. Confirm web is up
curl -sI https://onchain.chickenpicks.app/
```

The seed script funds 3 wallets, has them join the demo pool, and submits intentionally-bad picks for them. **The user (you) joins LIVE during the recording with the email-OTP flow** — your picks are *exact-score correct* for every match, so you naturally finish #1 at settle.

Demo pool defaults (2026 World Cup):
- Entry: 1 USDC
- 3 matches: Argentina v Brazil, Spain v France, Germany v Italy
- Prize split: 50 / 30 / 20
- Match results we'll post: **2-1, 1-1, 0-2**
- Demo user picks: **2-1, 1-1, 0-2** (3× exact score = 15 pts, top rank)
- Fake users picks: 3-0 / 2-2 / 1-1 (varies — all rank below the user)

---

## 0:00–0:20 · Hook + landing

**Screen**: `https://onchain.chickenpicks.app/` landing in mobile view (iPhone 12 in dev tools or actual phone). Tricolor wordmark visible. Sponsor logos along the bottom strip.

**Voiceover** (lead with the problem):
> "Latin Americans bet 25 billion dollars a year on football and lose up to 20% to the house — when the house pays at all. ChickenPicks puts every pool on Solana — atomic payout, no rake-pulling, no withdrawal reviews. Three minutes, end to end."

**On-chain**: contract addresses card visible — Program `Cdd5...b3ut`, demo pool. Solana Explorer link clickable.

---

## 0:20–0:50 · Login → embedded wallet → /pollas

**Screen**: tap **Sign in** → modal pops → enter email → 6-digit OTP → in 2 seconds we're at `/pollas` with the **"World Cup with Friends"** pool showing **3 active players**.

**Voiceover**:
> "Sign in with email. Privy mints a Solana wallet behind the scenes — no seed phrase, no extension. Three friends are already in the pool — fake users we funded for the demo, but every join transaction is real on-chain."

**On-chain**: fresh wallet address visible in header. Pool card shows "3 PLAYERS" + "3 USDC POT" pulled live from the Anchor program.

---

## 0:50–1:20 · Voice agent: discover → quote bridge → join

**Screen**: tap the floating **🎙 Talk to Coach** button. Conversation overlay opens.

**Conversation**:
- User: *"What pools are open?"*
- Agent (calls `list_pools`): "There's one open pool — World Cup with Friends, one USDC to enter, three matches."
- User: *"Open it."*
- Agent (calls `open_pool`): page navigates.
- User: *"I have USDC on Polygon — can I use that?"*
- Agent (calls `preview_bridge_quote`): "From Polygon a bridge would take about thirty seconds and cost five cents in fees, routed via Polymer. For now I can take USDC directly on Solana — want to use that?"
- User: *"Yes."*
- Agent (calls `join_pool` → modal opens with chain cards: Solana active, Polygon / ETH / Arbitrum / Base / Optimism / BSC marked **🔒 Coming soon · LI.FI**): "Confirm one USDC entry from your Solana wallet?"
- User: *"Confirm."*

**Voiceover overlay** (this is the killer line — say it out loud, not just on-screen):
> "Users sign Solana transactions by voice — same security as a wallet popup, with the friction of a conversation."

**On-chain**: `join_polla` tx fires. Solana Explorer link drops in the agent panel. Pool participant counter ticks 3 → 4.

---

## 1:20–1:50 · Voice agent: predict scores

**Conversation**:
- User: *"My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two."*
- Agent (calls `submit_picks`, reads back): "I heard Argentina two Brazil one, Spain one France one, Germany zero Italy two. Submit?"
- User: *"Yes, submit."*

**Voiceover overlay**:
> "Notice the read-back before submission — every on-chain action gets an explicit verbal confirm. No accidental signatures."

**On-chain**: `submit_prediction` tx fires; Solana Explorer link visible.

---

## 1:50–2:20 · Admin posts results + settles

**Screen direction**: open `/admin` (sign in as admin email). The same demo pool is listed.

**Voice/text overlay**:
> "The match-result oracle is a button for this demo — in production it's a Pyth Pull or Switchboard feed."

**Action**: type **2 1** for match 1, **1 1** for match 2, **0 2** for match 3 (these are EXACT matches for the user's predictions). Click **POST** for each. Then **SETTLE POOL**.

**Voiceover** (this is the camera-linger moment — let the Explorer load the tx for ~3s):
> "Inside one transaction: the 5% fee lands in treasury, ranks are computed on-chain by the simplified scoring rule, and `final_rank` is written into every prediction account. Atomic. The platform can't take a fee without settling."

**On-chain**: `settle_polla` tx fires. Inside the same tx: 5% fee = 0.20 USDC (4 players × 1 USDC × 5%) lands in treasury ATA, ranks computed (user = 15 pts, others 0-9 pts), `final_rank` written.

---

## 2:20–2:40 · Claim

**Screen direction**: switch back to the user tab → `/pollas/<pool>` now shows **"YOU RANKED #1"** + **CLAIM** button.

**Voiceover**:
> "Back as the user — I ranked first. Claim transfers 1.90 USDC to my embedded wallet — fifty percent of the after-fee pool. Strict-signer check on-chain — even our own treasury can't pull this slice."

**Action**: click **CLAIM**. `claim_prize` tx fires. Wallet balance updates from 0 to **1.90 USDC**.

---

## 2:40–3:00 · Mobile + outro

**Screen direction**: cut to phone screencast. Open the **ChickenPicks OnChain** Android APK. Same email login → **same Solana address** → `/pollas` browse → the same demo pool now showing claimed prize. Tap "🎙 Talk to Coach" → widget opens (proves voice on mobile too).

**Voiceover**:
> "Same email, same wallet, web or mobile. Native Android via Solana Mobile's wallet adapter. Voice agent ports to Android too. Solana for the settlement guarantees, LI.FI for the on-ramp, ElevenLabs for the interface, Solana Mobile for the surface — and one Anchor program tying them together."

**Outro card** (held 4 seconds):
- Sponsor logos: Solana / LI.FI / ElevenLabs / Solana Mobile
- Repo: `github.com/SantiagoDevRel/chickenpicks-hackathon`
- Program: `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut`
- URL: `onchain.chickenpicks.app`
- APK: `expo.dev/artifacts/eas/664x1jhPw9F5cMR3VkNv68.apk`

---

## Camera-linger moments (don't narrate over these)

1. **`settle_polla` in Explorer (1:55–2:10)** — pause on the inner instructions: fee transfer to treasury ATA + 4 rank writes inside one signature. Don't talk for 3 seconds.
2. **`🔒 Coming soon · LI.FI` payment cards (1:08)** — hold the modal so all six chain logos are on-screen for 2 seconds before user picks Solana.
3. **Same wallet web + mobile (2:45)** — split-second cut showing the same `9o8J…45wK` in both clients. Proves "same wallet" without voiceover.

---

## Voice prompt cheat sheet (literal lines to say)

| Order | Say this | Triggers |
|---|---|---|
| 1 | "What pools are open?" | `list_pools` |
| 2 | "Open World Cup with Friends" | `open_pool` (fuzzy match) |
| 3 | "I have USDC on Polygon — can I use that?" | `preview_bridge_quote` |
| 4 | "Use Solana directly, join now" | `join_pool` |
| 5 | "Confirm" | tx fires |
| 6 | "My picks: Argentina two Brazil one, Spain one France one, Germany zero Italy two" | `submit_picks` |
| 7 | "Yes, submit" | tx fires |

**Power phrases for the voiceover** (rehearsal copy):
- "We let users sign Solana transactions by voice."
- "There is no off-chain database — the Anchor program is the source of truth."
- "Inside one transaction: ranks, fees, and final position writes."
- "The only key that can drain a winner's prize is the winner's."
- "Same wallet across web and mobile. Same dApp store binary."

---

## Backup takes (record before the live take)

- **B-roll: LI.FI mainnet quote** — same voice prompt #3, capture the agent reply with real numbers.
- **B-roll: settle on a pre-settled 4-participant pool** — funded with `scripts/fund-user.ts`, settled in advance. Cut here if compute-budget makes the live single-tx settle nervous.
- **B-roll: `anchor test` happy-path output** — the green-tick assertion line `pred1.points eq 10 / pred2.points eq 6 / pred3.points eq 3`. Cut here if any live tx hangs.
- **Audio backup** — record the voiceover as a separate WAV.

---

## Pre-record checklist

- [ ] APK installed on the demo Android with email cached
- [ ] `pnpm seed:demo` ran fresh (pool open with 3 pre-joined users)
- [ ] Admin wallet has SOL for `settle_polla` (`solana balance` ≥ 0.5)
- [ ] Vercel deploy is green at `onchain.chickenpicks.app/inicio`
- [ ] ElevenLabs agent system prompt synced (paste from `docs/sponsors/elevenlabs.md`)
- [ ] Two browser tabs open: user (`/pollas`) + admin (`/admin`)
- [ ] One mobile mirror running for the cutaway at 2:40
- [ ] Mic test passed on the recording device
- [ ] Tabs muted except the recording tab (avoid voice agent autoplay collisions)
