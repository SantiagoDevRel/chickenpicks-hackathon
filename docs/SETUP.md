# ChickenPicks OnChain — Setup Guide

One-stop guide to get your dev environment ready. Work through the sections in order. Estimated time end-to-end: **~2 hours**, most of which is unattended downloads.

After each section, paste the requested output into chat so the implementation can move forward in parallel.

---

## §1 · Node 20 + pnpm (Windows host)

The repo is pinned to Node 20 LTS via `.nvmrc`. Node 24 (your current install) breaks several Solana/Anchor TS packages.

### 1.1 Install nvm-windows

1. Download the latest installer from https://github.com/coreybutler/nvm-windows/releases (`nvm-setup.exe`).
2. Run installer, accept defaults.
3. Restart PowerShell.
4. Verify: `nvm version` should print a version string.

### 1.2 Install Node 20

In a regular PowerShell:

```powershell
nvm install 20
nvm use 20
node --version    # should print v20.x.x
```

### 1.3 Install pnpm globally

```powershell
npm install -g pnpm@9.12.3
pnpm --version    # should print 9.12.3
```

### 1.4 Install repo dependencies

```powershell
cd C:\Users\STZTR\Desktop\claude-code-environment\chickenpicks-hackathon
pnpm install
```

(Will be a no-op until apps/packages exist — expected. Just confirms pnpm reads the workspace.)

✅ **Done when**: `node -v` shows v20, `pnpm -v` shows 9.x, no errors from `pnpm install`.

---

## §2 · WSL2 Ubuntu + Rust + Solana CLI + Anchor

Anchor on native Windows is unreliable (R5 in plan). Use WSL2 Ubuntu for all Rust/Solana commands.

### 2.1 Install WSL2 + Ubuntu

PowerShell **as Administrator**:

```powershell
wsl --install -d Ubuntu
```

Reboot if prompted. After reboot, Ubuntu launches; create a username + password (these are local-only, write them down).

### 2.2 Update Ubuntu + install build tools

Inside Ubuntu (just `wsl` from PowerShell):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential pkg-config libssl-dev libudev-dev curl git protobuf-compiler
```

### 2.3 Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# select option 1 (default)
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

### 2.4 Install Solana CLI 1.18.x

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
solana --version
```

Set cluster to devnet:

```bash
solana config set --url https://api.devnet.solana.com
solana config get
```

### 2.5 Install Anchor 0.31 via avm (Anchor Version Manager)

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.31.0
avm use 0.31.0
anchor --version    # anchor-cli 0.31.0
```

### 2.6 Install Node 20 inside WSL too (for `anchor test`)

Anchor's TS test runner needs node + yarn/pnpm inside the same shell as `anchor build`. Easiest: install nvm inside WSL.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pnpm@9.12.3 yarn
```

### 2.7 Access the Windows repo from WSL

```bash
cd /mnt/c/Users/STZTR/Desktop/claude-code-environment/chickenpicks-hackathon
ls
```

You should see `package.json`, `pnpm-workspace.yaml`, etc.

> ℹ️ Filesystem note: `/mnt/c/...` is slow for Anchor builds. **Better: clone the repo a second time inside WSL home** (`~/chickenpicks-hackathon`) and use that copy for `anchor build/test/deploy`. Push from either side; git is the source of truth.

✅ **Done when**: inside WSL, `solana --version`, `anchor --version`, `cargo --version`, `node --version` (v20) all return without error.

---

## §3 · Privy app (auth + embedded Solana wallets)

Free tier covers 1k MAU — plenty for the hackathon.

1. Go to https://dashboard.privy.io and sign up with your email.
2. Click **Create new app**. Name: `ChickenPicks OnChain`. App type: `Web` (we'll add Mobile config inside the same app later).
3. In the new app's sidebar:
   - **Login methods** → enable **SMS** (phone OTP). Disable everything else for now.
   - **Embedded wallets** → enable **Solana**. Set default network to **Devnet**. Enable "Auto-create on login for users without wallets".
   - **Allowed origins** → add `http://localhost:3000` and `https://onchain.chickenpicks.app`.
4. Sidebar **API keys**:
   - Copy **App ID** (starts with `clp...` or similar) — this is `NEXT_PUBLIC_PRIVY_APP_ID`.
   - Reveal + copy **App secret** — this is `PRIVY_APP_SECRET`. **Never commit; server-side only.**
5. **Paste both into chat** so they get wired into `.env` (NOT committed) and the implementation continues.

> ⚠️ The Privy "session signer" feature (used by the voice agent on Day 2) may live under a different sidebar entry — we'll explore once we have the app open. If it's gated by a paid plan, fallback in Risk R3 applies.

✅ **Done when**: app exists in dashboard, Solana + SMS enabled, App ID + secret pasted in chat.

---

## §4 · ElevenLabs workspace + Conversational AI agent

Free tier gives ~10k characters/month — sufficient for demo + a few rehearsals.

1. Go to https://elevenlabs.io and sign up.
2. Profile menu → **API keys** → create a new key. Copy it. This is `ELEVENLABS_API_KEY`.
3. Sidebar → **Conversational AI** → **Agents** → **Create agent**.
   - Name: `ChickenPicks Coach`
   - Voice: pick **Brian** or **Bill** (we can swap on Day 3).
   - LLM: leave default (likely Gemini Flash 1.5 or GPT-4o-mini).
   - System prompt — paste this placeholder; we'll refine on Day 3:

     ```
     You are ChickenPicks Coach, a concise football-prediction assistant.
     The user is signed in via phone OTP and has an embedded Solana wallet.
     You can: list active pollas, describe a polla's matches, check the
     user's USDC balance, and submit a prediction for a specific polla.
     You CANNOT deposit funds, withdraw, or sign anything other than
     predictions — for those, tell the user to use the wallet UI.
     Keep responses under 2 sentences. Confirm scores back to the user
     before submitting. Speak in English.
     ```

   - Tools: leave empty for now — wired in Day 1/2.
4. Save. Copy the **Agent ID** from the agent's settings page. This is `ELEVENLABS_AGENT_ID`.
5. **Paste API key + Agent ID into chat.**

✅ **Done when**: agent exists in dashboard, API key + Agent ID pasted in chat.

---

## §5 · Solana devnet keypairs + faucet

Run inside WSL after §2 done.

```bash
cd ~/chickenpicks-hackathon   # or /mnt/c/... — your choice
mkdir -p keys

# Deployer + treasury + admin authority (one wallet, hackathon scope)
solana-keygen new --no-bip39-passphrase -o keys/deployer.json
solana config set --keypair keys/deployer.json
solana address                       # paste this in chat → NEXT_PUBLIC_PLATFORM_AUTHORITY

# Program ID keypair (the program's own address)
solana-keygen new --no-bip39-passphrase -o keys/program.json
solana address -k keys/program.json  # paste this in chat → NEXT_PUBLIC_PROGRAM_ID

# Airdrop devnet SOL (5 attempts of 2 SOL each — faucet caps per call)
for i in 1 2 3; do solana airdrop 2 --url devnet; sleep 2; done
solana balance                       # should be 4-6 SOL
```

> ⚠️ The `keys/` dir is `.gitignore`'d. **Never paste the file contents in chat — only the public addresses (`solana address` outputs).** If you do leak a keypair, run `solana-keygen new` again and update everything.

✅ **Done when**: `keys/deployer.json` and `keys/program.json` exist; deployer balance ≥ 4 SOL; both pubkeys pasted in chat.

---

## §6 · Vercel project + `onchain.chickenpicks.app` subdomain

DNS propagation takes minutes-to-hours, so kick this off as early as possible — even before the web app is deployable.

### 6.1 Create the Vercel project

1. Go to https://vercel.com and sign in.
2. **Add New** → **Project** → **Import Git Repository** → select `SantiagoDevRel/chickenpicks-hackathon`.
3. Framework: leave **Next.js** (will be detected once `apps/web` exists).
4. **Root Directory**: set to `apps/web`.
5. **Build & Output Settings**: leave defaults (turbo handles it).
6. Skip env vars for now (will add after Privy/ElevenLabs keys arrive).
7. Click **Deploy**. First deploy will fail (no app yet) — that's fine; we just need the project created.

### 6.2 Attach subdomain

In the new Vercel project → **Settings** → **Domains** → **Add**:

- Domain: `onchain.chickenpicks.app`
- Vercel shows a CNAME target: copy it (typically `cname.vercel-dns.com`).

### 6.3 Add CNAME at your DNS registrar

Wherever you manage DNS for `chickenpicks.app` (Vercel, Cloudflare, Namecheap, etc.):

- Type: `CNAME`
- Name / Host: `onchain`
- Value / Target: `cname.vercel-dns.com` (whatever Vercel showed)
- TTL: default (300s or auto)
- Proxy/cloud: **off** if Cloudflare (so Vercel can issue the cert directly)

Wait 5–10 minutes, then in Vercel domains panel click **Refresh** until the green checkmark + "Valid configuration" appears.

✅ **Done when**: `onchain.chickenpicks.app` shows valid in Vercel; visiting the URL returns the Vercel placeholder page (until the app is actually deployed).

---

## Recap — what to paste in chat

By the end of setup, send these in chat (one message is fine):

```
NEXT_PUBLIC_PRIVY_APP_ID = clp...
PRIVY_APP_SECRET = ...
ELEVENLABS_API_KEY = sk_...
ELEVENLABS_AGENT_ID = agent_...
NEXT_PUBLIC_PROGRAM_ID = <pubkey from keys/program.json>
NEXT_PUBLIC_PLATFORM_AUTHORITY = <pubkey from keys/deployer.json>
```

I'll then:
1. Add them to `.env` locally (gitignored).
2. Add them to the Vercel project's env vars.
3. Pin `NEXT_PUBLIC_PROGRAM_ID` into `packages/shared/src/constants.ts` and the Anchor source's `declare_id!()`.
4. Unblock A1 (Anchor deploy), A2/A3 (web/mobile login wiring), A4 (voice hello-world).

If anything in this guide breaks, paste the exact error in chat — don't push past it.
