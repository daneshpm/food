# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Mintoo" — a food delivery PWA **and native Android app** (via Capacitor) for BTM Layout, Bangalore, with a real multi-role architecture: customers, kitchens ("hotels"), delivery riders, and staff/admin all have distinct login flows and panels. React 19 + TypeScript + Vite, Firebase (Firestore/Auth/Cloud Messaging) as the backend, Razorpay for payments (both web checkout.js and a native Capacitor/Cordova plugin), Telegram + FCM for notifications.

This repo (`shalyagaonkar520-web/fooddd`) is a separate, more advanced lineage of the same underlying app than a sibling repo (`shalyagaonkar520-web/foodd`, no third `d`) — this one has gone on to build out native Android builds (3 separate APKs: Admin, Kitchen, Rider — see `build_apks.js`) and the full multi-role system, while the sibling repo stayed web-only and single-restaurant. Don't assume fixes made in one apply cleanly to the other; they've diverged.

## Commands

```bash
npm install
npm run dev            # vite dev server on 0.0.0.0:3000 (includes an in-process API mock, see below)
npm run build          # vite production build to dist/
npm run lint           # tsc --noEmit (no ESLint, no test runner)
npm run optimize-images  # resize (max 1000px) + recompress everything in public/images/
npm run generate-icons   # regenerate pwa-icon-192.png and pwa-icon-512.png from public/logo.png
npm run deploy          # gh-pages -d dist
```

Native Android builds go through `build_apks.js` (invokes Capacitor + Gradle) and `android/` (a real Android Studio project) - not something `npm run build` alone produces. `.aab`/`.apk` files are gitignored; don't commit build output (two were previously committed by mistake and have been removed from tracking, though they remain in git history - see Upgrade log).

All product/menu photos live in `public/images/`; nothing else belongs in `public/` except PWA/SEO/legal essentials (`logo.png`, `pwa-icon-*.png`, `robots.txt`, `sitemap.xml`, `firebase-messaging-sw.js`, `_redirects`, `privacy.html`, `terms.html`, `support.html`, `delete-account.html` - the last four are required for Play Store listing compliance).

## Architecture

### Four distinct login systems - inconsistent security, read this before touching auth

| Role | Component | Mechanism | Security |
|---|---|---|---|
| Customer | `AuthPage.tsx` | Firebase Auth (Google/email) | Standard, fine |
| Delivery rider | `RiderLogin.tsx` | Firebase Auth (`signInWithEmailAndPassword`) | Fine |
| Staff/Admin | `StaffLogin.tsx` | POSTs to `api/login.js` (rate-limited, no hardcoded fallback credentials, real security headers) | Fine on the server side, but **see the client-side bypass below** |
| Kitchen ("hotel") | `HotelLogin.tsx` | Queries Firestore `hotels` collection directly, comparing a **plaintext password field** via `where('password', '==', password)` | **Broken/insecure - see Known issues** |

**Admin session bypass**: `AdminPage.tsx` and `ChatPage.tsx` both check `localStorage.getItem('admin_auth') === 'true'` and grant full admin access if so, with **no server-side re-verification**. `StaffLogin.tsx` sets this flag after a real `/api/login` check, but since it's a plain localStorage read, anyone can set `localStorage.setItem('admin_auth', 'true')` in their browser console and get admin access with no credentials at all. `AdminPage.tsx` also fails **open**: if the Firestore read of a user's `staff/{uid}` role doc throws for any reason, the catch block grants admin access rather than denying it (`catch (_) { setAdminId(user.uid); }`).

### Deployment - three parallel backends

Same pattern as the sibling repo: `api/*.js` (Vercel), `netlify/functions/*.ts` (Netlify), and a Vite dev-server mock in `vite.config.ts`'s `api-mock-server` plugin. Update all three when changing an API route or local dev will diverge from production. `api/login.js` is well-hardened (rate limiting, security headers, CORS, requires `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars with no insecure default) - a good reference for what the other admin-adjacent endpoints should look like.

### Multi-role data model

- `hotels/{id}` - kitchen/restaurant profiles. `Product.hotelId` in `src/types.ts` scopes menu items to a specific kitchen; `menuStore.ts`, `Checkout.tsx`, `HotelPanel.tsx`, `AdminPage.tsx` all filter/write by `hotelId`. This is the real, wired-up version of the "multi-restaurant" concept - unlike the sibling repo where the equivalent `Hotel` type was fully dead code.
- `riders/{uid}` - delivery partners, keyed by their Firebase Auth uid.
- `staff/{uid}` - staff/admin accounts, keyed by Firebase Auth uid, with a `role` field (`'admin'` grants `AdminPage.tsx` access - see the bypass above for why this check isn't actually load-bearing today).
- `orders/{id}` - carries a role-relevant subset of fields for customer tracking (`TrackingPage.tsx`), kitchen fulfillment (`HotelPanel.tsx`), and delivery (`DeliveryDashboard.tsx`, also mounted at `/rider`).
- `chats/{orderId}/messages/{id}` - support chat, `ChatPage.tsx` at `/chat/:orderId`.

### Firestore rules (`firestore.rules`)

Broad `if request.auth != null` gates on most collections, including `hotels`/`riders`/`staff` - but `HotelLogin.tsx`'s query against `hotels` runs *before* any Firebase Auth sign-in, so either that login is currently broken against these exact rules, or the rules actually deployed to the live Firebase project are more permissive than what's in this file (the same rules-drift problem seen in the sibling repo - **verify what's actually published in the Firebase Console before assuming this file is authoritative**).

### Payments

Same dual-path pattern in `Checkout.tsx`: web `checkout.razorpay.com/v1/checkout.js` normally, native `RazorpayCheckout` Capacitor/Cordova plugin when `Capacitor.isNativePlatform()`. See Known issues for the hardcoded key and missing verification, shared by both paths.

### Notable UI details

- `index.html` has an inline script that unregisters all service workers and clears all caches on every page load - deliberate (per commit history: "WebView ServiceWorker cache purging for instant APK/AAB updates"), needed to stop old Android WebView installs getting stuck on stale cached content. It does mean the PWA's offline-caching benefit is largely self-defeating on repeat visits; don't "fix" this without understanding why it was added.
- `AdminPage.tsx` has a "greetings" feature (king/queen/anonymous dialogue lines, stored in `localStorage`) - cosmetic personalization text shown somewhere in the customer UI, not a bug, just unusual naming if you're grepping around.

## Known issues (found during a fresh audit, not yet fixed - flagging before further work)

1. **`HotelLogin.tsx` stores and checks plaintext passwords via a client-side Firestore query.** Whether or not the currently-published Firestore rules allow this query to succeed for unauthenticated users, the architecture itself is unsound - passwords should never be compared client-side against a database record. Needs a real fix (Firebase Auth, matching `RiderLogin.tsx`, or a secured server endpoint, matching `StaffLogin.tsx`/`api/login.js`), not a rules tweak.
2. **Admin access can be granted with one `localStorage.setItem('admin_auth', 'true')` call in any browser console** - no credentials needed. `AdminPage.tsx` and `ChatPage.tsx` both trust this flag with no server-side check. Additionally fails open on a Firestore read error (grants access instead of denying it).
3. **Hardcoded live Razorpay key as a fallback**: `Checkout.tsx` has `key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_...'` - if the env var isn't set in a given deployment, payments silently go through someone else's live Razorpay account with no indication anything's misconfigured.
4. **No server-side Razorpay payment verification anywhere** - `completeOrder(response.razorpay_payment_id)` trusts whatever payment ID the browser reports, for both the web and native payment paths. Since that handler runs entirely in client JS, a payment ID could be fabricated to mark an order "paid" without paying.

## Tech stack & tools in use

- **Framework/build**: React 19, TypeScript 5.8, Vite 6, `@vitejs/plugin-react`
- **Native app**: Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/app`), native Google Auth (`@codetrix-studio/capacitor-google-auth`), native Razorpay (`com.razorpay.cordova`) - real Android Studio project in `android/`, built via `build_apks.js` into three separate app variants
- **Styling**: Tailwind CSS v4, `clsx` + `tailwind-merge`
- **Routing**: React Router v7
- **State**: Zustand
- **Animation**: Framer Motion / `motion`
- **Backend-as-a-service**: Firebase (client SDK: Auth, Firestore, Cloud Messaging; `firebase-admin` server SDK in Vercel functions)
- **Maps/location**: Leaflet
- **PWA**: `vite-plugin-pwa` (see the cache-purging note above for why this is partially self-defeating by design)
- **Deployment**: Vercel + Netlify in parallel, plus GitHub Pages via `gh-pages`
- **Image tooling**: `sharp` powers `scripts/optimize-images.mjs` and `scripts/generate-icons.mjs`

## Upgrade log

- **2026-09-21** — Fresh audit and cleanup pass (this repo had never had one; the sibling repo `foodd` got a similar pass on 2026-09-19/20):
  - Removed 72 duplicate images sitting in the repo root (byte-identical to files already in `public/` - verified via hash comparison, not just assumed) and 2 further orphaned/unreferenced images plus an orphaned `public/manifest.json` (superseded by `vite-plugin-pwa`'s generated one, never linked from `index.html`)
  - Reorganized `public/` (previously flat) into `public/images/`, rewrote every reference
  - Converted 48 opaque PNGs to JPEG (none had real transparency): `public/images/` ~24.6MB → ~5MB, PWA precache payload ~27.8MB → ~8MB
  - Fixed `pwa-icon-192.png` (was a mislabeled 600x600 JPEG) and the missing `pwa-icon-512.png` (referenced, never existed)
  - Removed dead code: `three`/`@react-three/fiber`/`@react-three/drei` and the two components that used them (`SpecialThreeSection.tsx` - never imported; `DeliveryAnimation.tsx` - imported in `Checkout.tsx`, never rendered) - identical pattern to the sibling repo
  - Fixed a real bug in `vite.config.ts`'s local-dev login mock: referenced `email`/`password` without ever destructuring them from the parsed request body, would throw on every local admin login attempt
  - Untracked two committed `.aab` files (34MB each, already covered by `.gitignore`'s `*.aab` rule but committed before that rule existed) and `.idea/` (now gitignored) - `.git` history itself is still ~205MB from these across many "Build AAB version N" commits; shrinking that needs a history rewrite, deliberately not done without explicit sign-off
  - Deleted ~90 files of root clutter: 81 one-off `fix-*.cjs`/`update-*.cjs` patch scripts, a stray `assets/` build-output folder, `firebase - Copy.json`, `temp.txt`, `test-border.html`, `test-icons.js`, `scratch/`
  - **Found but not yet fixed** (see Known issues above): the `HotelLogin.tsx` plaintext-password pattern, the `admin_auth` localStorage bypass + fail-open role check, the hardcoded Razorpay key fallback, and missing payment verification
  - All verified with `tsc --noEmit` and a full `vite build`; done on a branch (`claude/cleanup-audit`), not pushed to `main`
