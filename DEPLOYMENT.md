# Red Bird International — Deployment Guide

## Architecture

Two completely separate URLs from one Node server:

| URL | Entry | Contents |
|---|---|---|
| `https://redbird-international.com/` | `index.html` | Public website only (Home, Products, Services, Reviews, Contact, Track, Verify, Client Portal, Brand Book) |
| `https://redbird-international.com/admin` | `admin.html` | Management dashboard only (login-gated, `noindex` for search engines) |

- The public bundle contains **zero admin code** and **zero passcodes**.
- Admin passcode is verified **server-side** at `/api/admin/verify-passcode` with rate limiting (5 attempts / 10 min per IP). Override the default passcode with the `ADMIN_PASSCODE` environment variable.
- Legacy admin hash links (`#redbird-admin`, `#secure-portal-redbird`, etc.) redirect to `/admin`.
- AI document drafting has a built-in fallback engine, so documents still generate even if the Gemini key is missing or quota-exhausted.

## Environment Variables (.env)

```
GEMINI_API_KEY=...        # Gemini AI (document drafting, chat, voice)
RESEND_API_KEY=...        # Email notifications (optional)
ADMIN_PASSCODE=...        # Admin login passcode (REQUIRED in production!)
CLOUDFLARE_API_TOKEN=...  # Optional: auto-connect the domain (see below)
VITE_FIREBASE_*           # Firebase web config (already baked in client)
```

## Run (production)

```bash
npm run build
npm start          # serves dist/ + API on port 3000
```

## Connect the domain — two options

### Option A: Automatic (needs Cloudflare API token)
1. Create an API token at Cloudflare (Zone:DNS:Edit + Zone:Zone:Edit for redbird-international.com).
2. Set `CLOUDFLARE_API_TOKEN` in .env, then run: `node scripts/cloudflare-setup.mjs`
   (or POST to `/api/cloudflare/configure` from the admin panel).

### Option B: Manual DNS (hosting provider)
Point these records at your server / Cloud Run host:
```
redbird-international.com.    A     -> <server IPv4>
www                           CNAME -> redbird-international.com
admin.redbird-international.com (optional) CNAME -> redbird-international.com
```
If the admin URL should also be reachable at `https://admin.redbird-international.com`, add this reverse-proxy rule on your host: route host `admin.` to `/admin`.


## Domain Status — LIVE (completed 2026-10-01)

`redbird-international.com` is publicly serving the App Hosting backend. Final Cloudflare DNS state:

| Record | Value | Mode |
|---|---|---|
| A `redbird-international.com` | 199.36.158.100 | DNS-only (Firebase Hosting verification requires it) |
| A `redbird-international.com` | 199.36.158.101 | DNS-only |
| CNAME `www` | redbird-international.com | Proxied (301 → apex) |

Removed during cleanup: Vercel CNAME + `_vercel` TXT, Squarespace `_domainconnect`, junk subdomain AAAA, two orphan Workers custom domains (www → worker `redbirdinternational`, `swapsnokutheir.com...` → worker `steep-water-d8b3`), and the Cloudflare Access login wall that blocked all public traffic.

Preserved: Google Mail MX/SPF/DMARC, `hosting-site` TXT (Firebase domain claim), Google site verifications.

**Remaining step (owner):** the backend currently serves the previous build. Deploy this package (project `studio-9655859853-3da1f`, App Hosting backend `ais-pre-...run.app`) — after deploy, `/` serves the new 221KB public bundle and `/admin` serves the dedicated management dashboard.

## Firestore Rules (hardened 2026-10-01 — safe & recommended to deploy)

`firestore.rules` has been rewritten with a strict security model that matches how the app actually works:
- **Admin** = Google Sign-In with a verified admin email (`sumon.hanwha@gmail.com`, `redbird.inc.co.bd@gmail.com` — edit the `isAdmin()` list to change). The anonymous-auth bypass has been **removed**.
- **All business collections** (orders, buyers, invoices, users, employees, tasks, communications, documents, expenses, budgets, contracts, brand guidelines, AI memories) — admin only.
- **Shipment tracking** — any signed-in user can read; only admin can write.
- **Reviews** — public read, sign-in required to post; edits limited to up/downvotes.
- **Contact form (inquiries)** — anyone can submit (validated), only admin reads.
- **Default deny** — anything not matched above is fully blocked.

Deploying the rules (optional — the live database already denies anonymous access, this file formalizes it):
Firebase Console → Firestore → Databases → `ai-studio-fffd0f84-...` → Rules → paste the contents of `firestore.rules` → Publish.


## Admin Login Configuration (complete)

### Option A — Passcode login (works immediately after deploy, zero Firebase setup)
- URL: `https://redbird-international.com/admin`
- Passcode: **redbird2026** (default)
- Email field: optional — leave blank (defaults to `sumon.hanwha@gmail.com`)
- 5 wrong attempts = 10-minute lockout (server-side rate limit)

**To change the passcode:** in Firebase App Hosting settings for the backend, set the environment variable `ADMIN_PASSCODE` to your new value. The server reads it at startup (`process.env.ADMIN_PASSCODE`).

### Option B — Google Sign-In (requires 3 Firebase console settings)
1. **Firebase Console → Authentication → Sign-in method → enable "Google"**
2. **Authentication → Settings → Authorized domains → add `redbird-international.com`** (popups will fail without this)
3. Allowed admin emails (hardcoded in `components/AdminPortal.tsx` + `firestore.rules`):
   - `sumon.hanwha@gmail.com`
   - `redbird.inc.co.bd@gmail.com`
   - any address ending in `@redbird-international.com`
   To add another admin, edit the email list in both files and rebuild.
