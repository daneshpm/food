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

### Four login systems, now consistently backed by real Firebase Auth sessions

| Role | Component | Mechanism |
|---|---|---|
| Customer | `AuthPage.tsx` | Firebase Auth (Google/email) |
| Delivery rider | `RiderLogin.tsx` | Firebase Auth (`signInWithEmailAndPassword`) |
| Staff/Admin | `StaffLogin.tsx` | POSTs to `api/login.cjs`, which verifies `ADMIN_EMAIL`/`ADMIN_PASSWORD` (rate-limited, security headers, no insecure fallback), then mints a Firebase custom token (deterministic uid derived from the admin email) and ensures a `staff/{uid}` doc with `role: 'admin'` exists. Client calls `signInWithCustomToken`. |
| Kitchen ("hotel") | `HotelLogin.tsx` | POSTs to `api/hotel-auth.cjs` (`mode: 'login'`), which verifies the password server-side against a hash (scrypt) stored in the `hotels` doc, then mints a custom token **using the existing `hotels/{hotelId}` doc id as the uid** (so every other place that already keys data by `hotelId` - menu items, orders, `AdminPage.tsx` - keeps working unchanged) and ensures a matching `staff/{hotelId}` doc with `role: 'hotel'`. |

All four now end in a real, verifiable Firebase Auth session that Firestore rules can check - there is no more client-side-only "flag in localStorage" auth anywhere. If you're adding a new role/panel, follow this pattern; do not add another localStorage-flag shortcut, no matter how tempting it looks for a quick admin-only page gate (see Upgrade log for what that cost here).

Passwords for hotels/kitchens are set via `api/hotel-auth.cjs` (`mode: 'set-password'`, gated by the `ADMIN_AUTH_TOKEN` bearer header - same convention as `api/settings.js`/`api/send-push.cjs`), which hashes them server-side. Nothing in this app should ever write a plaintext `password` field to Firestore or compare one client-side again.

### Deployment - three parallel backends

Same pattern as the sibling repo: `api/*.{js,cjs}` (Vercel), `netlify/functions/*.ts` (Netlify), and a Vite dev-server mock in `vite.config.ts`'s `api-mock-server` plugin. Update all three when changing an API route or local dev will diverge from production. **The Vite dev mock does not implement the real `login.cjs`/`hotel-auth.cjs` custom-token logic** - it's a simpler standalone mock, so those two endpoints can only be exercised against a real Vercel deployment with `FIREBASE_SERVICE_ACCOUNT` configured, not via `npm run dev`.

Any `api/*.js` file that uses `firebase-admin` must be `.cjs`, not `.js` - confirmed live (not just suspected) that an ESM version crashes on Vercel with `FUNCTION_INVOCATION_FAILED` at module load, despite working fine in local `node --check`/`node -e` testing. `api/_firebaseAdmin.cjs` is the shared init helper every firebase-admin-dependent function should import from; see its file comment for the full story if you're tempted to "clean this up" back to `import`.

### Multi-role data model

- `hotels/{id}` - kitchen/restaurant profiles, doc id also used as the Firebase Auth uid for that kitchen's login (see above). `Product.hotelId` in `src/types.ts` scopes menu items to a specific kitchen; `menuStore.ts`, `Checkout.tsx`, `HotelPanel.tsx`, `AdminPage.tsx` all filter/write by `hotelId`. This is the real, wired-up version of the "multi-restaurant" concept - unlike the sibling repo where the equivalent `Hotel` type was fully dead code.
- `riders/{uid}` - delivery partners, keyed by their Firebase Auth uid.
- `staff/{uid}` - staff/admin/hotel role records, keyed by Firebase Auth uid, with a `role` field (`'admin'` or `'hotel'`) that both `firestore.rules`' `isAdmin()` helper and each panel's own client-side check depend on.
- `orders/{id}` - carries a role-relevant subset of fields for customer tracking (`TrackingPage.tsx`), kitchen fulfillment (`HotelPanel.tsx`), and delivery (`DeliveryDashboard.tsx`, also mounted at `/rider`).
- `chats/{orderId}/messages/{id}` - support chat, `ChatPage.tsx` at `/chat/:orderId`.

### Firestore rules (`firestore.rules`)

`hotels`/`riders`/`staff` writes now require either a verified admin (`isAdmin()`, a rules function that looks up `staff/{request.auth.uid}.role == 'admin'`) or the record's own owner (`request.auth.uid == hotelId`/`riderId`). `menu`/`system` writes require `isAdmin()` too. All of these previously only checked `request.auth != null` - any signed-in customer could read or write any hotel's record (including its then-plaintext password), any rider's record, or edit the live menu/site settings directly via the client SDK. **Still true as before: verify what's actually published in the Firebase Console matches this file** - rules-drift between this file and what's live has bitten this project before (see the sibling repo's history).

### Payments

Dual-path in `Checkout.tsx`: web `checkout.razorpay.com/v1/checkout.js` normally, native `RazorpayCheckout` Capacitor/Cordova plugin when `Capacitor.isNativePlatform()`. Both share the same order-creation and verification flow: `api/create-razorpay-order.js` creates the order server-side before checkout opens (so the later signature can be checked against an order_id/amount the client never controlled), and `api/verify-razorpay-payment.js` verifies Razorpay's HMAC-SHA256 signature after payment - `completeOrder()` is only called if that succeeds, for both paths. "Pay Online"/GPay/PhonePe are hidden entirely (falls back to Cash on Delivery) when `VITE_RAZORPAY_KEY_ID` isn't set, rather than falling back to a hardcoded key the way this used to. See Known issues for the one part of this that's unverified (the native path, no device available here).

### Notable UI details

- `index.html` has an inline script that unregisters all service workers and clears all caches on every page load - deliberate (per commit history: "WebView ServiceWorker cache purging for instant APK/AAB updates"), needed to stop old Android WebView installs getting stuck on stale cached content. It does mean the PWA's offline-caching benefit is largely self-defeating on repeat visits; don't "fix" this without understanding why it was added.
- `AdminPage.tsx` has a "greetings" feature (king/queen/anonymous dialogue lines, stored in `localStorage`) - cosmetic personalization text shown somewhere in the customer UI, not a bug, just unusual naming if you're grepping around.

### Scroll performance

Same root cause as the sibling repo's scroll-jank fix: `backdrop-filter`/`backdrop-blur-*` on a `fixed`/`sticky` element forces the browser to re-sample it on every scroll frame, because native scroll compositing is cheap and blur isn't. Fixed on the four elements that stay on screen *while* content scrolls beneath them: `Header.tsx`, `BottomCartBar.tsx`, `Checkout.tsx`'s bottom CTA bar, and `FoodInfoPage.tsx`'s sticky header.

A second, larger source found afterward: the small "Fast"/"Hot"/veg-indicator badges drawn on *every* product card in `HomePage.tsx`'s two grids and `CategoryPage.tsx`'s grid also used `backdrop-blur-*`. These aren't fixed elements, but they're rendered once per item with no virtualization - a menu with 40+ items means 80-120+ blurred layers the browser has to keep re-compositing as the whole grid scrolls, which in practice costs more than the four single fixed-position instances combined. Removed `backdrop-blur` from all of them and bumped the badge background opacity (e.g. `/85` → `/95`, `/60` → `/75`) to keep the same visual weight without the blur.

Left alone: every other `backdrop-blur` usage in this codebase is on a modal/overlay (`fixed inset-0` dialogs, popups, toasts) or a single non-repeated instance (e.g. `FoodInfoPage.tsx`'s own badges, `HomePage.tsx`'s location-picker chip) - those pay the blur cost once when they open/render, not per-card times the length of a scrolling grid, so they were never the actual problem. If scroll still feels slow after this, profile before reaching for Lenis/GSAP - they solve a different problem (custom easing/inertia), not compositing cost, and would add more per-frame JS work on top of whatever's actually slow.

Also added `loading="lazy"` to the repeated product-image `<img>` tags in `HomePage.tsx` and `CategoryPage.tsx` (the menu/category grids) - none of them had it, meaning every image on the page loaded eagerly regardless of scroll position. Left the hero banner and category icon strip eager (above the fold, small fixed count).

### Design system / color theme

The app's colors are centralized in `src/index.css`'s Tailwind v4 `@theme` block, which remaps generic Tailwind color names to this app's actual palette - e.g. `orange-500`/`600`/`700` and the custom `--color-brand`/`--color-brand-hover`/`--color-gold` tokens are the **primary brand accent** (buttons, active/selected states, links, icons), currently an indigo→cyan gradient (`#6366F1` → `#22D3EE`, see `--gradient-brand`). `gray-50`/`100` are the near-black page/surface background. Most of the app (all four dashboards, Checkout's detail rows, Orders/Profile/Tracking pages) reads these tokens via plain Tailwind classes (`bg-orange-500`, `text-brand`, etc.), so a future palette change is mostly a one-file edit in `index.css` - but **`HomePage.tsx`, `CategoryPage.tsx`, `FoodInfoPage.tsx`, `AuthPage.tsx`, `CityGateway.tsx`, and a few others hardcode the old brand hex directly** (`#39B54A`, `#080808`, `#121212`, and a second, unrelated hardcoded orange `#FC8019` that a few files used independently of the theme) instead of the semantic classes - those needed individual find/replace and won't pick up a future token-only change.

**`green-500`/`600` is deliberately a separate, untouched real-green scale** (`#39B54A`/`#2e9d3d`) - used only for the veg indicator dot, non-veg's paired red, and price/money display. These carry meaning to users (green = vegetarian, green = amount) independent of whatever the brand accent color is, so **never repoint `green-500` at the brand token**, and when adding a new "brand accent" usage, use `orange-500`/`brand`/`accent`, not `green-500`, even though visually the old green theme made the two hard to tell apart in code.

Utility classes added for this: `.gradient-brand` (background), `.text-gradient-brand` (gradient text, used on the "OO" in the MINTOO logo and a few headings), `.btn-gradient-brand`, `.bg-mesh` (the radial-gradient page background, replaces flat `bg-[#080808]`), and `.glass-card`/`.glass-card-brand`/`.glass-panel` (real `backdrop-blur` glassmorphism - border + translucent bg + inset highlight). **`.glass-card` is reserved for single-instance surfaces** (the `AuthPage.tsx` login card, `Checkout.tsx`'s order summary card, modals) - never apply it to anything rendered in a list/grid; that's exactly the scroll-jank pattern the perf pass above just removed. Persistent fixed/sticky chrome (`Header.tsx`, `BottomNav.tsx`, `BottomCartBar.tsx`) intentionally stays solid-background instead of glass for the same reason.

A handful of gradients were deliberately left **off** the brand token because their color has its own meaning independent of brand: the "Cash on Delivery" icon and `FunGreetingBanner.tsx`'s king/queen royal theme use a literal amber/gold (`amber-*` + `#F97316`), `IncomingOrderPopup.tsx`'s "New Order" header and the offline-retry dialog in `Checkout.tsx` use a literal warm red-orange (alert/urgency, not brand), and `OffersPage.tsx`'s per-deal card colors are intentionally varied. If you repoint the brand token again, grep for `#F97316`/`amber-` combos before assuming everything orange should follow the brand color.

## Known issues

Fixed 2026-09-22 (see Upgrade log for detail): the `HotelLogin.tsx` plaintext-password pattern (plus a second, worse copy of it found embedded in `HotelPanel.tsx` with a hardcoded 16-combination login backdoor), the `admin_auth`/`hotel_auth` localStorage bypasses, the fail-open role checks, the hardcoded Razorpay key fallback, and missing payment verification (both the web and native/Capacitor checkout paths).

Still open:
1. **No password-reset UI for hotel accounts beyond a single "Reset Password" button** in `AdminPage.tsx`'s hotel list (uses a browser `prompt()`, not a proper form) - functional but minimal.
2. **The native (Capacitor/Cordova) Razorpay payment-verification path is unverified against a real device/emulator** - no Android device or emulator available in this environment. The code assumes the native plugin returns `razorpay_order_id`/`razorpay_signature` alongside `razorpay_payment_id` once `order_id` is set on the checkout options (per Razorpay's own docs, and consistent with the web SDK), and fails closed (shows an error, does not complete the order) if those fields are missing rather than trusting an unverified payment - but this needs a real native build to confirm it actually works end to end, not just that it fails safely.
3. **`npm audit` reports 17 pre-existing vulnerabilities** (8 moderate, 9 high) as of 2026-09-22, all transitive (build tooling and `firebase-admin`'s `@google-cloud/storage` dependency chain: `xmldom`, `baseline-browser-mapping`, `brace-expansion`, `browserslist`, `fast-uri`, `fast-xml-parser`, `nanoid`, `postcss`, `react-router`). Same class of finding as the sibling repo. Not force-fixed - `npm audit fix --force` would major-version-bump `react-router` and other core deps with no guarantee of a clean upgrade; needs a deliberate, tested pass with the owner's sign-off, not an automatic one.

## Tech stack & tools in use

- **Framework/build**: React 19, TypeScript 5.8, Vite 6, `@vitejs/plugin-react`
- **Native app**: Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/app`), native Google Auth (`@codetrix-studio/capacitor-google-auth`), native Razorpay (`com.razorpay.cordova`) - real Android Studio project in `android/`, built via `build_apks.js` into three separate app variants
- **Styling**: Tailwind CSS v4, `clsx` + `tailwind-merge`
- **Routing**: React Router v7
- **State**: Zustand
- **Animation**: Framer Motion / `motion`; `gsap` for dashboard stat counters (`src/components/ui/AnimatedCounter.tsx`) - only used from `AdminPage.tsx`/`HotelPanel.tsx`/`DeliveryDashboard.tsx`, all lazy-loaded routes, so its cost is isolated to a separate chunk paid only by staff/kitchen/rider users, never by customers browsing the storefront
- **Backend-as-a-service**: Firebase (client SDK: Auth, Firestore, Cloud Messaging; `firebase-admin` server SDK in Vercel functions)
- **Maps/location**: Leaflet
- **PWA**: `vite-plugin-pwa` (see the cache-purging note above for why this is partially self-defeating by design)
- **Deployment**: Vercel + Netlify in parallel, plus GitHub Pages via `gh-pages`
- **Image tooling**: `sharp` powers `scripts/optimize-images.mjs` and `scripts/generate-icons.mjs`

## Upgrade log

- **2026-09-22 (6)** — Full app-wide color scheme redesign (customer's choice from a palette/scope prompt: "Indigo SaaS" direction, applied to the whole app):
  - Reworked `src/index.css`'s `@theme` tokens: the brand accent (`orange-500`/`brand`/`gold` tokens) moved from the old flat green to an indigo→cyan gradient (`#6366F1` → `#22D3EE`); backgrounds moved from pure black/gray to a near-black with a faint violet tint plus a radial gradient mesh (`.bg-mesh`). `green-500`/`600` was deliberately kept as a separate, untouched real-green scale for the veg indicator and price/money display - see the new "Design system / color theme" section above for the full reasoning and what must never be repointed.
  - Added reusable utility classes: `.gradient-brand`, `.text-gradient-brand`, `.btn-gradient-brand`, `.bg-mesh`, and real glassmorphism (`.glass-card`/`.glass-card-brand`/`.glass-panel`) - applied to the `AuthPage.tsx` login card and `Checkout.tsx`'s order summary card (both single-instance surfaces). Deliberately *not* applied to anything in a repeated grid/list, or to the persistent fixed nav chrome (`Header.tsx`/`BottomNav.tsx`/`BottomCartBar.tsx`), to avoid reintroducing the exact scroll-jank pattern removed in (2).
  - Because most of the app already read color through Tailwind's semantic classes (`orange-500`, `brand`, etc.), the theme-token change alone re-themed the four dashboards, Checkout's detail rows, and the Orders/Profile/Tracking pages with no per-file edits. The exceptions - `HomePage.tsx`, `CategoryPage.tsx`, `FoodInfoPage.tsx`, `AuthPage.tsx`, `AuthModal.tsx`, `CityGateway.tsx`, `App.tsx`'s splash/toast/ambient chrome, `BottomNav.tsx`, `BottomCartBar.tsx` - hardcoded the old brand hex directly and needed individual conversion, always preserving veg-dot/price green and never touching it.
  - Found and fixed real collateral damage from repurposing the `orange-*` Tailwind scale as the brand token: several places used `orange-500`/`600` as a literal warm color inside a deliberately non-brand gradient (the royal gold theme in `FunGreetingBanner.tsx`, the profile-photo and rider-marker gold rings in `ProfilePage.tsx`/`TrackingPage.tsx`, the "hot deal"/"urgent" gradients in `IncomingOrderPopup.tsx`/`Checkout.tsx`'s offline dialog/`OffersPage.tsx`) - these had the `orange-500`/`600` stop replaced with a literal hex so they keep their intended non-brand color regardless of what the brand token is set to.
  - Also found and fixed a second, unrelated hardcoded brand color (`#FC8019`/`#E06C00`, a Swiggy-orange literal hex, independent of the theme system) scattered across `AuthModal.tsx`, `Checkout.tsx`, `DeliveryDashboard.tsx`, `SupportPage.tsx`, and `TermsPage.tsx` - converted to the new brand token/gradient. Also fixed a stray invalid Tailwind class (`bg-orange-505`, a typo) found in `DeliveryDashboard.tsx` while in there.
  - Verified with `tsc --noEmit` and a full `vite build` after every batch of changes, not just at the end.

- **2026-09-22 (5)** — Customer storefront visual/performance pass (following up on the dashboard-only pass in (3), now covering `HomePage.tsx`/`CategoryPage.tsx`/`Checkout.tsx`):
  - Found and removed `backdrop-blur` from the per-product-card badges in `HomePage.tsx` (both grids) and `CategoryPage.tsx` - a bigger scroll-jank contributor than the four fixed-element instances fixed in (2), since it repeats once per rendered card with no virtualization. See the updated "Scroll performance" section above.
  - Evaluated the storefront for the same "feels AI-generated" markers already fixed in the dashboards (emoji-as-icon, hardcoded defaults, plaintext auth) - found none: the "MINTOO" logo treatment is deliberate brand identity (not a candidate for a GradientText-style swap), and the emoji used in toasts/badges/Telegram messages is consistent existing brand voice across the whole app, not a one-off AI-slop pattern like the dashboard nav emoji were - left both alone rather than changing them without a clear defect to fix.
  - Ran `npm audit`: 17 pre-existing transitive vulnerabilities found, not fixed - see Known issues above for why.
  - Verified with `tsc --noEmit` and a full `vite build`.

- **2026-09-22 (4)** — Fixed the last two Known Issues from the 2026-09-21 audit: the hardcoded live Razorpay key fallback and missing payment verification, for both the web and native (Capacitor/Cordova) checkout paths in `Checkout.tsx`.
  - New `api/create-razorpay-order.js` (creates the order server-side before checkout opens) and `api/verify-razorpay-payment.js` (verifies the HMAC-SHA256 signature after payment) - neither needs `firebase-admin`, so plain `.js` (ESM) is fine, unlike the auth-related endpoints.
  - `Checkout.tsx`: removed `key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_...'` entirely; the GPay/PhonePe/Cards payment options are now hidden from the UI (falls back to Cash on Delivery) when `VITE_RAZORPAY_KEY_ID` isn't set, instead of silently using someone else's live key. Both the web `handler` callback and the native `payment.success` listener now go through the same `verifyAndComplete()` helper, which calls `api/verify-razorpay-payment.js` and only calls `completeOrder()` if it succeeds - fails closed (shows an error, doesn't complete the order) rather than trusting an unverified payment id.
  - Mirrored both endpoints in the Vite dev-server mock (`vite.config.ts`) so local dev exercises the same real Razorpay API calls once `VITE_RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are in `.env.local`. Also removed the dead `GEMINI_API_KEY` `define` block and unused `loadEnv` destructure while in there (leftover AI Studio scaffolding, confirmed unused anywhere in `src/`).
  - **Native path not verified against a real device** (no Android device/emulator available here) - see Known Issues.
  - Verified with `tsc --noEmit`, a full `vite build`, and a dev-server smoke test confirming both new endpoints fail gracefully (clear JSON error, not a crash) when Razorpay isn't configured.

- **2026-09-22 (3)** — Dashboard polish pass (scoped to the panels that manage the business - `HotelPanel.tsx`, `AdminPage.tsx`, `DeliveryDashboard.tsx` - per the owner's request to prioritize "highest attention" areas over the customer storefront):
  - Added `src/components/ui/AnimatedCounter.tsx` (GSAP count-up, formattable) and used it for every stat number across all three dashboards (order counts, revenue, rider/hotel counts, earnings, deliveries done) instead of static numbers
  - Replaced emoji used as functional UI icons (`👨‍🍳`, `🛵`, `🏪`) with the `lucide-react` icons already used elsewhere in the same files, for visual consistency - left emoji in toast messages alone (`toast.success('...🎉')`), that's a reasonable, common pattern for transient confirmations, not the same thing as an icon
  - `HotelPanel.tsx`: added an at-a-glance stats row (Pending/Preparing/Active Total, computed from already-loaded order data, no new Firestore reads) and an order-age indicator (`OrderAge`, turns red past 15 minutes) on each order card - a kitchen prioritizing live orders needs to know how long one's been waiting, which nothing showed before
  - Deliberately did not touch the customer-facing storefront (`HomePage.tsx`/`Checkout.tsx`/etc.) in this pass, or add Lenis - see the note above about why Lenis doesn't fit a mobile-first app and would risk reintroducing the scroll jank just fixed

- **2026-09-22 (2)** — Scroll performance: removed `backdrop-blur` from the four persistent (fixed/sticky) elements that stayed on screen during scroll - `Header.tsx`, `BottomCartBar.tsx`, `Checkout.tsx`'s bottom bar, `FoodInfoPage.tsx`'s sticky header - same root cause as the sibling repo's earlier fix, left every modal/popup's blur untouched since those only pay the cost once on open. Added `loading="lazy"` to the repeated menu/category grid images in `HomePage.tsx`/`CategoryPage.tsx`, which had no lazy-loading at all. See the new "Scroll performance" section above for the reasoning and what was deliberately left alone.

- **2026-09-22** — Fixed the two most severe findings from the 2026-09-21 audit (see Known issues above for current state):
  - New `api/_firebaseAdmin.cjs`, `api/login.cjs` (replaces `api/login.js`), `api/hotel-auth.cjs`. All three security-critical fixes below depend on these establishing real Firebase Auth sessions server-side.
  - **`HotelLogin.tsx`**: no longer queries Firestore directly with a plaintext password; now calls `api/hotel-auth.cjs`, which hashes/verifies server-side and mints a custom token.
  - **Found and removed a second, worse copy of the same bug while fixing the first one**: `HotelPanel.tsx` had its own embedded login form, never reached in the normal flow but still shipped to every client, with (a) the same plaintext Firestore query, (b) a **hardcoded backdoor** of 4 emails × 4 passwords (16 combinations, e.g. `kitchen@mintoo.com`/`kitchen123`) that granted full kitchen panel access, and (c) a fallback comparing against a client-cached password list. Deleted entirely, not just hidden - `HotelPanel.tsx` now only trusts a real `onAuthStateChanged` session and redirects to `/hotel-login` otherwise.
  - **Admin bypass**: `AdminPage.tsx` and `ChatPage.tsx` no longer trust `localStorage.getItem('admin_auth') === 'true'` (anyone could set this from devtools with no credentials). Both also no longer fail open on a Firestore role-lookup error (previously granted access on error; now denies and signs out).
  - Removed the hardcoded default password (`'minto@2026'`) that pre-filled the hotel-creation form in `AdminPage.tsx` - every new kitchen partner got the identical guessable password unless the admin manually retyped it. Also removed a plaintext-password display feature (with a show/hide toggle) from the admin hotel list, replacing it with a "Reset Password" action that calls the new hashing endpoint.
  - `firestore.rules`: added an `isAdmin()` helper (`staff/{uid}.role == 'admin'`); `hotels`/`riders`/`staff` writes now require it (or, for hotels/riders, the record's own owner) instead of just `request.auth != null`; `menu`/`system` writes now require it too - previously any signed-in customer could write any of these directly via the client SDK.
  - Proactively converted `api/send-push.js` to `.cjs` too (same ESM/Vercel firebase-admin crash risk, confirmed live in the sibling repo, applied here before it could bite in production rather than after).
  - Verified via `tsc --noEmit`, a full `vite build`, and direct invocation of the new/changed `.cjs` handlers with mock request objects (the Vite dev-server mock doesn't implement the real custom-token logic - see the Deployment section above). Done on the `claude/cleanup-audit` branch, not pushed to `main`. `tsc`/`vite build` intermittently crashed with out-of-memory errors during this session due to severe system memory pressure (down to ~0.2-0.4GB free) unrelated to these changes - if you hit the same thing, it's worth checking free memory before assuming a code regression.

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
