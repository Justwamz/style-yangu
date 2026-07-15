# Tailor / Artisan App Implementation Plan

**Goal:** Build the Style Yangu Tailor & Artisan PWA (spec §6) — profile/portfolio, order management, artisan POS with measurements, measurement appointments, and an escrow flow (M-Pesa stubbed).

**Architecture:** Reuse the seller account/auth. A tailor is a `sellers` row with `seller_type` in {tailor, cobbler, bag_maker, jewellery_maker} and a new `artisan_tier`. The tailor app is a separate frontend (`apps/tailor`) that shares the seller OTP login (`sy_seller_token`) and adds artisan-only API routes. Escrow modeled in DB; real M-Pesa payout deferred behind a `configured()` guard.

**Tech stack:** React 18 + TS + Vite + Tailwind + React Router v6 + React Query (mirrors apps/seller).

## Global Constraints
- Reuse `sy_seller_token`, `/seller/auth/otp/*`, `/seller/onboarding/complete` (existing).
- New API routes prefixed `/artisan/*`, guarded by `requireArtisan` (role === 'seller').
- Completion photos mandatory before an order can move to `ready_for_collection`.
- Escrow release marks the record released; if M-Pesa not configured, payout is stubbed (noted in response). No real money moves until Phase 2.
- Tailwind tokens identical to seller app. Vite dev port 5175. New render.yaml block `style-yangu-tailor`.

---

## Task 1: Types (`packages/types/src/index.ts`)
Append: `ArtisanOrderStatus`, `ArtisanMeasurements`, `ArtisanOrderBrief`, `ArtisanOrder`, `ArtisanAppointmentSlot`, `ArtisanPortfolioItem`, `EscrowTxStatus`, `EscrowTransaction`, `ArtisanProfile`, `ArtisanDashboard`. Reuse existing `ArtisanType`, `ArtisanTier`.

## Task 2: Migrations (`services/api/src/db/migrate.ts`)
- ALTER sellers: `artisan_tier` (default 'free'), `specialisation_tags` TEXT[], `turnaround_days` INT, `price_range` TEXT, `verified` BOOL.
- CREATE `artisan_orders`, `artisan_appointments`, `artisan_portfolio`, `escrow_transactions` + indexes.

## Task 3: API routes (`services/api/src/routes/artisan.ts`) + mount in `index.ts`
`requireArtisan` guard. Endpoints: profile GET/PATCH, dashboard, orders CRUD + status transitions + photos, portfolio GET/POST/DELETE, appointments GET/POST/PATCH, escrow GET + release. `mpesaConfigured()` helper guards payout.

## Task 4: App scaffold (`apps/tailor/`)
Clone seller config: package.json (`@style-yangu/tailor`), vite.config.ts (port 5175, PWA name "Style Yangu Tailor"), tsconfig(.node).json, tailwind.config.ts, postcss.config.cjs, index.html, favicon, src/index.css, src/main.tsx, src/App.tsx, ArtisanContext (reuses sy_seller_token, GET /artisan/profile), ProtectedRoute, AppShell (nav: Dashboard, Orders, Appointments, Profile), routes/index.tsx, auth/PhoneEntry + OTPVerify (reuse /seller/auth), onboarding (business name + artisan type → /seller/onboarding/complete), useArtisanTier hook.

## Task 5: Pages (`apps/tailor/src/pages`)
DashboardTab, OrdersTab, OrderDetailPage, OrderNewPage (brief + measurements by type), AppointmentsTab (slot mgmt, tier-gated), ProfileTab (business details + specialisation + portfolio + escrow summary + tier).

## Task 6: render.yaml + type-check + commit
Add `style-yangu-tailor` static block. `pnpm --filter @style-yangu/tailor type-check` and API type-check clean before commit.
