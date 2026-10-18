# IIIT Nagpur Training & Placement — Web Frontend

Responsive React + Vite web portal for students, placement administrators, and superadministrators. The interface follows the requested teal theme (primary `#19a88f`, hover `#38d5b2`) while adapting the mobile experience to desktop navigation, readable tables, accessible forms, and role-specific dashboards.

## Run locally

Requires Node.js 20.19+ or 22.12+ (recommended for Vite 8)

```bash
cp .env.example .env
npm install
npm run dev
```

The provided `.env.example` already contains the current public TNP Supabase URL/publishable key, Google Web Client ID, and backend URL. The values are safe for frontend use: **never place a Supabase service-role key or Google OAuth client secret in any `VITE_*` variable**.

If your existing `.env` has escaped URLs like `https\://...` or trailing backslashes copied from a shell, this frontend normalizes those values at runtime. It is still best to keep `.env` in the standard form shown below.

```env
VITE_BACKEND_API_URL=https://crispr-tnp.onrender.com
VITE_SUPABASE_URL=https://vyghlmxfyjsukkpqejfi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_oVjsp2S93N15rrZkPrT3Gw_TEWDmJ2z
VITE_GOOGLE_CLIENT_ID=488607035119-bo5qqaq4vh27s2v25e3nsffjsfa5p162.apps.googleusercontent.com
VITE_USE_API_PROXY=true
```

## Google sign-in and nonce validation

The login screen uses a single Google Identity Services button. The Google Web Client ID should have `http://localhost:5173` under **Authorized JavaScript origins**, and the exact deployed origin when hosted publicly. The existing TNP Supabase project's Google provider must allow this Web Client ID alongside existing mobile client IDs.

Google receives the SHA-256 hash of a fresh cryptographic nonce, while `supabase.auth.signInWithIdToken()` receives the original nonce, as required by the current Supabase Google ID-token flow. The nonce is regenerated after each attempt, so failed sign-ins can be retried without reusing stale nonce state. Both the Google ID token and resulting Supabase account are checked for the `@iiitn.ac.in` email domain; the backend independently enforces college identity and roles.

## CORS and API routing

### Local development

`vite.config.js` proxies `/api`, `/storage`, `/share`, and `/health` to `VITE_BACKEND_API_URL`. In `npm run dev`, frontend API calls use relative paths through the proxy, avoiding browser cross-origin preflights for the backend API. A failed proxy request displays a backend reachability message instead of silently appearing to be a CORS error.

### Deployment

A Vite development proxy is **not included in a static production build**. In production, the browser calls `VITE_BACKEND_API_URL` directly, so the deployed FastAPI backend must allow the exact origin where this frontend is hosted. Configure the backend's `CORSMiddleware` with the production origin (and local origins only if needed), the methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`, and headers `Authorization, Content-Type, Accept`. Avoid combining unrestricted `allow_origins=["*"]` with credentials in a public deployment. After changing backend CORS settings, redeploy the backend; frontend code alone cannot change CORS headers returned by a separately hosted API.

Uploads follow the backend's signed-URL handshake. Browser uploads go directly to Supabase Storage; if a browser reports CORS specifically for a `storage/v1/object/upload/sign/...` URL, that is a separate Storage-origin issue, not the FastAPI API proxy.

## Source structure

The app shell and authentication live in `src/App.jsx`, shared UI primitives live in `src/components/`, and each role's feature pages are separated under `src/pages/student/`, `src/pages/admin/`, and `src/pages/superadmin/`. Public frontend configuration lives in `src/config.js`; it contains only browser-safe values.

## Features

- **Student:** eligible opportunities, eligibility checks, apply/reject workflow, resume and cover-letter management, application tracker, notifications, and contact profile.
- **Admin:** dashboard, drives, structured drive creation, applicants, selection rounds and candidate results, CSV templates/uploads, reminders, active students, analytics, and logs.
- **Superadmin:** system/database overview, student CRUD and CSV import, admin roles, drive overrides, application overrides, and audit logs.

## Commands

```bash
npm run lint
npm run build
npm run preview
```
