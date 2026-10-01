# NEXUS ARENA — Complete Setup Guide

> **COMPETE. CONQUER. DOMINATE.** — professional esports tournament platform.
> Next.js 16 · React 19 · TypeScript · Tailwind · MongoDB · Razorpay · AI assistants

This guide is **copy-paste friendly for Windows, Mac and Linux**. Follow it top to bottom.

- **Part 1** — Run it on localhost (works with ZERO keys, then optional keys)
- **Part 2** — Every API key explained (where to get it, step by step)
- **Part 3** — Deploy 100% free on Vercel
- **Part 4** — Troubleshooting (fixes for every common error)

---

## What you need installed

| Tool | Version | How to install |
| --- | --- | --- |
| **Node.js** | 20.x or newer (22 LTS recommended) | [nodejs.org](https://nodejs.org) → LTS installer (on Windows just click Next-Next-Finish) |
| **npm** | comes with Node.js | verify with `npm -v` |
| **Git** | any recent | [git-scm.com](https://git-scm.com) |
| **A code editor** | any | [VS Code](https://code.visualstudio.com) recommended |

Check your versions (PowerShell / Terminal):

```bash
node -v     # must print v20.x or higher
npm -v
```

---

# PART 1 — Run on localhost

## Step 1 — Get the code

```bash
git clone <your-repo-url> nexus-arena
cd nexus-arena
```

(Or unzip the project folder and open a terminal inside it.)

## Step 2 — Install dependencies

```bash
npm install
```

First install takes a few minutes. When it finishes you should see `node_modules` in the folder.

## Step 3 — Start the website (zero configuration!)

```bash
npm run dev
```

Open **http://localhost:3000** — that's it. The website works immediately:

- ✅ All pages, tournaments, brackets, teams, leaderboard, dashboards, admin panel
- ✅ Email/password register + login
- ✅ Free-tournament registration end-to-end
- ✅ AI assistants in "data mode" (live answers from the database)
- ✅ An **in-memory database starts automatically** (no MongoDB install needed)

> ⚠️ The in-memory database resets every time you stop the server. That's normal for
> first-run / demo mode. For persistent data, do Step 4.

You'll see this friendly warning in the terminal — it is NOT an error:

```
[db] MONGODB_URI is not set — using an auto-managed in-memory database. ...
```

## Step 4 — (Recommended) Persistent database + demo data

**Option A — free MongoDB Atlas (works everywhere, recommended):** see [Part 2 → MongoDB](#2-mongodb_uri--mongodb-atlas-free) and paste the connection string into `.env.local`.

**Option B — quick local persistence:** install MongoDB Community locally and use
`MONGODB_URI=mongodb://localhost:27017/nexus-arena`.

Then create your `.env.local` (Windows PowerShell):

```powershell
copy .env.example .env.local
notepad .env.local
```

Mac/Linux:

```bash
cp .env.example .env.local
nano .env.local
```

Minimum content (everything else is optional):

```env
MONGODB_URI=memory
AUTH_SECRET=paste-a-random-64-char-string-here-see-part-2
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save the file and **restart** `npm run dev`.

## Step 5 — Load demo data (optional but fun)

```bash
npm run seed
```

This creates 8 games, 6 tournaments, 8 teams, 32 players and demo payments.

**Demo logins** (password for all: `Password@123`):

| Role | Email |
| --- | --- |
| Super Admin | `admin@nexusarena.gg` |
| Organizer | `organizer@nexusarena.gg` |
| Players | any `<username>@nexusarena.gg` (e.g. `arjun_mehta@nexusarena.gg`) |

Sign in at http://localhost:3000/login — the admin panel is at **/admin**, the organizer studio at **/create-tournament**.

## Step 6 — Verify everything works

```bash
npm run typecheck    # TypeScript check → should print 0 errors
npm run test:api     # 24 functional API tests → all should pass
npm run build        # production build → should compile 52 routes
```

---

# PART 2 — Every API key explained

Only **2 values are required** in production (`MONGODB_URI`, `AUTH_SECRET`). Everything
else unlocks extra features and can be added later — the site never breaks without them.

| Variable | Required? | What it enables | Cost |
| --- | --- | --- | --- |
| `MONGODB_URI` | **Yes** (on Vercel) | Database | **Free** (Atlas M0) |
| `AUTH_SECRET` | **Yes** (on Vercel) | Secure login sessions | Free (you generate it) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Correct links/OAuth/webhooks | Free |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | "Sign in with Google" button | Free |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Optional | Paid tournament entry (UPI/cards/netbanking) | Free account, per-txn fees |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | Payment webhook verification | Free |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | Optional | LLM-powered assistant answers | Pay-per-use (or free models) |
| `EMAIL_API_KEY` / `EMAIL_FROM` | Optional | Real notification emails | **Free** (Resend 3k/month) |

## 1. `AUTH_SECRET` — session security (you generate it, free)

Any long random string, minimum 32 characters. Generate one:

**Windows PowerShell:**

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Mac/Linux:**

```bash
openssl rand -base64 48
```

Paste the output into `.env.local`:

```env
AUTH_SECRET=your-generated-string
```

## 2. `MONGODB_URI` — MongoDB Atlas (free) 🇮🇳

Atlas M0 is free forever (512 MB — plenty for thousands of players).

1. Go to **https://www.mongodb.com/cloud/atlas/register** → create a free account.
2. **Build a database** → choose **M0 (FREE)** → pick the region closest to your users
   (e.g. Mumbai) → Create.
3. Left menu **Security → Database Access** → **Add New Database User**
   → name `nexususer` → **Password** (copy it somewhere safe) → role **Read and write to any database** → Add.
4. Left menu **Security → Network Access** → **Add IP Address** → choose
   **Allow Access From Anywhere** (`0.0.0.0/0`) → Confirm.
   (Required for Vercel; fine for development too.)
5. **Overview → Connect → Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://nexususer:<password>@cluster0.xxxxx.mongodb.net/
   ```

6. Replace `<password>` with the real password and add `nexus-arena` at the end:

   ```env
   MONGODB_URI=mongodb+srv://nexususer:YOURPASSWORD@cluster0.xxxxx.mongodb.net/nexus-arena
   ```

> Local shortcut: `MONGODB_URI=memory` runs an auto-managed in-memory database
> (data resets on restart). Perfect for trying the site; never use it on Vercel.

## 3. Google login (optional) — free

1. Go to **https://console.cloud.google.com** (sign in with any Google account).
2. Top bar → **Select a project** → **New Project** → name it `nexus-arena` → Create.
3. **APIs & Services → OAuth consent screen** → User type **External** → fill app name +
   your email → Save (Scopes/optional: skip) → add yourself as **Test user**.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised redirect URIs** → add the exact callback URL(s):
     - Local: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://YOUR-PROJECT.vercel.app/api/auth/google/callback`
   - Replace the hostname/port with the exact site you sign in on. Google checks the scheme, host, port, and full path; `/api/auth/google` is **not** the callback.
   - If you still see `redirect_uri_mismatch`, copy the exact URI printed in the server terminal as `[auth] Google OAuth redirect URI:` and add it here. Save, then retry.
5. Copy the **Client ID** and **Client Secret**:

   ```env
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
   ```

Without these keys the site works fine — email/password login is fully functional.

## 4. Razorpay payments (optional) — free account

Enables paid tournaments via UPI, cards, netbanking and wallets (India).

1. Go to **https://dashboard.razorpay.com/signup** → create a free account.
2. Complete the (free) KYC basics, or stay in **Test Mode** for development.
3. **Settings → API Keys → Generate Key** → copy both values:

   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxx
   ```

4. **Settings → Webhooks → Add New Webhook** (production):
   - URL: `https://YOUR-PROJECT.vercel.app/api/payments/webhook`
   - Secret: invent a strong string (copy it to `RAZORPAY_WEBHOOK_SECRET`)
   - Active events: `payment.captured`, `payment.failed`
   - For local testing use [ngrok](https://ngrok.com) (`ngrok http 3000`) to get a public URL.

   ```env
   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
   ```

Without Razorpay keys: **free tournaments work 100%**; paid ones show a clear message
that payments aren't configured yet.

## 5. AI assistant LLM (optional)

The assistants work **without any key** in data-mode (answers come from live database
queries). To add natural-language LLM answers, use any OpenAI-compatible API:

**OpenAI:** https://platform.openai.com/api-keys

```env
AI_API_KEY=sk-xxxxx
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

**Free alternative (OpenRouter free models):** https://openrouter.ai/keys

```env
AI_API_KEY=sk-or-xxxxx
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

## 6. Email notifications (optional) — Resend free tier

1. Go to **https://resend.com** → sign up (3,000 emails/month free).
2. **API Keys → Create API Key** → copy it:

   ```env
   EMAIL_API_KEY=re_xxxxx
   EMAIL_FROM="NEXUS ARENA <no-reply@yourdomain.com>"
   ```

Without it, emails are printed to the server console (perfect for development).

## Complete `.env.local` template

```env
# ── Required on Vercel, optional locally ─────────────────────
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/nexus-arena
AUTH_SECRET=your-64-char-random-string
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Optional features ────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
EMAIL_API_KEY=
EMAIL_FROM="NEXUS ARENA <no-reply@nexusarena.gg>"
```

---

# PART 3 — Deploy FREE on Vercel

Everything below stays inside free tiers: **Vercel Hobby + MongoDB Atlas M0**.

## Step 1 — Put the code on GitHub

```bash
git init
git add .
git commit -m "NEXUS ARENA"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nexus-arena.git
git push -u origin main
```

(Create the empty repo at https://github.com/new first. On Windows you can also use
GitHub Desktop.)

> `.env.local` is git-ignored — **never** push real keys to GitHub.

## Step 2 — Import the project

1. Go to **https://vercel.com/new** → sign in with GitHub.
2. **Import** your `nexus-arena` repository.
3. Vercel auto-detects **Next.js** — don't change the build settings.
4. Before Deploying, open **Environment Variables** and add at minimum:

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | your Atlas connection string (Part 2 → #2) |
   | `AUTH_SECRET` | your generated random string (Part 2 → #1) |
   | `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (the URL Vercel shows) |

   Optionally add the Google / Razorpay / AI / Email variables now or later.

5. Click **Deploy** → wait ~2 minutes → **Congratulations!** 🎉

## Step 3 — Point the site at its real URL

After the first deploy, confirm `NEXT_PUBLIC_APP_URL` equals your live URL
(e.g. `https://nexus-arena.vercel.app`) in **Settings → Environment Variables**,
then **Redeploy** (Deployments → ⋯ → Redeploy) so links and cookies use the right domain.

## Step 4 — Load demo data into Atlas (from your computer)

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/nexus-arena" npm run seed
```

**Windows PowerShell:**

```powershell
$env:MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/nexus-arena"; npm run seed
```

## Step 5 — Production URLs for external services

| Service | Where | URL to set |
| --- | --- | --- |
| Google OAuth | Credentials → your OAuth client → redirect URI | `https://YOUR-PROJECT.vercel.app/api/auth/google/callback` |
| Razorpay webhook | Settings → Webhooks | `https://YOUR-PROJECT.vercel.app/api/payments/webhook` |
| Razorpay keys | use **live** keys when going live | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` |

Then set every new key in Vercel → Settings → Environment Variables → **Redeploy**.

## What works without any paid service

- ✅ All pages, auth, tournaments, brackets, teams, dashboards, admin panel, AI data-mode
- ✅ Free-tournament registrations
- ✅ Atlas M0 database (free forever)
- ✅ Vercel Hobby hosting (free for personal projects)

---

# PART 4 — Troubleshooting

| Error / symptom | Fix |
| --- | --- |
| `MONGODB_URI is not set…` in the terminal | Normal in zero-config mode (auto in-memory DB with a warning). For persistent data create `.env.local` (Part 1 → Step 4). On **Vercel** it means you forgot the `MONGODB_URI` variable — add it and redeploy. |
| `MONGODB_URI=memory is not supported on serverless…` | Set a real Atlas connection string in Vercel env vars. |
| `AUTH_SECRET must be set on Vercel…` | Generate a secret (Part 2 → #1) and add it to Vercel env vars. |
| `Port 3000 is in use` | Close the other app, or run `npm run dev -- -p 3001`. |
| `npm install` fails / `ERESOLVE` | Update Node.js to 20+ then delete `node_modules` and `package-lock.json`, run `npm install` again. |
| Google button says "not configured" | That's fine — Google keys are optional. To enable, complete Part 2 → #3. |
| Paid tournament says "payments not configured" | Add Razorpay keys (Part 2 → #4). Free tournaments always work. |
| Emails not arriving | `EMAIL_API_KEY` is optional; without it emails print to the terminal console. |
| Data disappeared | You were on `MONGODB_URI=memory` (resets on restart) — switch to Atlas. |
| `next build` out of memory | Run `$env:NODE_OPTIONS="--max-old-space-size=3072"` (PowerShell) or `NODE_OPTIONS="--max-old-space-size=3072" npm run build`. |
| Windows: scripts won't run (`running scripts is disabled`) | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell, or use `cmd` where `npm` works normally. |

---

## Project structure & scripts

```
npm run dev        → development server (http://localhost:3000)
npm run build      → production build (52 routes)
npm run start      → serve the production build locally
npm run typecheck  → TypeScript check (0 errors)
npm run seed       → demo data (admin@nexusarena.gg / Password@123)
npm run test:api   → 24 functional API tests (auto-boots an in-memory DB)
```

```
src/
├── app/          pages + REST API (route groups: (public), (auth), dashboard, admin)
├── components/   UI kit, layout, bracket-view, charts
├── hooks/        useAuth · useFetch · useRealtime (SSE)
├── lib/          db · auth · validation (zod) · bracket-engine · rate-limit · email
├── models/       Mongoose schemas + indexes
└── services/     tournament · payment · notification · ai · audit logic
scripts/          seed.ts · test-api.ts
```

## Security notes

- Passwords hashed with bcrypt (12 rounds) · sessions are httpOnly JWT cookies
- Payment signatures are verified **server-side** (HMAC-SHA256) — client success is never trusted
- CSRF double-submit tokens · rate limiting · Zod validation on every input · RBAC on every admin route · audit logs · security headers + CSP
- Secrets live only in environment variables — never in code or GitHub

## License

MIT — build something legendary. 🏆
