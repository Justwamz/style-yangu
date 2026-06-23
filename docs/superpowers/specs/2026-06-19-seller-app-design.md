# Style Yangu — Seller App Design

**Date:** 2026-06-19
**Status:** Approved
**Spec source:** StyleYangu_ProdSpec_v4.txt § 5, § 7, § 9

---

## 1. Overview

The seller app (`apps/seller`) is a PWA at `sell.styleyangu.com` (dev: `localhost:5174`). It gives boutique sellers, cobblers, tailors, bag makers, and jewellery makers an AI showcase tool, inventory management, point of sale, client list, storefront, and ad boost dashboard — all in one mobile-first interface.

**Scope of this design:** Full seller MVP — all four implementation plans.

**Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Vite, Vitest + Testing Library, `@tanstack/react-query`, `@style-yangu/api-client`, `@style-yangu/types`.

---

## 2. Routing Architecture

```
/auth                       ← phone OTP entry + verify
/onboarding                 ← business setup wizard
/                           ← AppShell (bottom nav)
  /dashboard                ← today's stats + quick actions
  /inventory                ← item grid + filter chips
  /inventory/new            ← item creation wizard (4 steps)
  /inventory/:id            ← item detail / edit / regenerate showcase
  /pos                      ← POS home (today's sales + outstanding)
  /pos/new                  ← record sale flow
  /clients                  ← client list
  /clients/:id              ← client detail + try-on
  /profile                  ← tier, settings, ad boost, storefront link
```

Auth guard: `ProtectedRoute` component reads `sy_seller_token` from localStorage. Unauthenticated → redirect to `/auth`. Onboarding incomplete → redirect to `/onboarding`.

---

## 3. State Management

### SellerContext
Global context holding the authenticated seller's profile and tier. Mirrors `ProfileContext` in the consumer app.

```typescript
interface SellerContextValue {
  profile: SellerProfile | null
  loading: boolean
  refresh: () => void
}
```

Fetches `GET /seller/profile` on mount. Exposes `refresh()` for post-edit invalidation.

### React Query
All list/detail data (inventory, POS transactions, clients, face library) fetched via `useQuery` hooks. Mutations use `useMutation` with cache invalidation. Keys: `['inventory']`, `['pos']`, `['clients']`, `['faces']`.

### JWT Storage
Token stored at `sy_seller_token` in localStorage. `@style-yangu/api-client` will be extended: export a `createApiClient(tokenKey: string)` factory so the seller app instantiates `createApiClient('sy_seller_token')`. The existing `apiClient` export becomes `createApiClient('sy_token')` for backwards compatibility with the consumer app.

---

## 4. New Types (`packages/types/src/index.ts`)

```typescript
// ── Seller ────────────────────────────────────────────────────────────────────
export type SellerType = 'seller' | 'cobbler' | 'tailor' | 'bag_maker' | 'jewellery_maker'

export interface SellerProfile {
  id: string
  businessName: string
  sellerType: SellerType
  tier: SellerTier
  generationsUsed: number
  generationsLimit: number       // 5 trial | 20 hustler | 60 boutique | -1 brand
  phone: string
  avatarUrl: string | null
  instagramHandle: string | null
  whatsappNumber: string | null
  location: string | null
  bio: string | null
  createdAt: string
}

export interface ShowcaseJob {
  id: string
  itemId: string
  mode: 'full_body' | 'face_neck' | 'studio'
  faceId: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  resultUrl: string | null
  watermarked: boolean
  createdAt: string
}

export interface POSTransaction {
  id: string
  sellerId: string
  itemId: string | null
  itemName: string
  listedPriceKES: number
  finalPriceKES: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  clientNickname: string | null
  clientUsername: string | null
  whatsappNumber: string | null
  createdAt: string
}

export interface SellerClient {
  id: string
  sellerId: string
  nickname: string
  consumerUsername: string
  lastPurchaseDate: string | null
  tryOnSent: number
  tryOnActed: number
}

export interface TryOnSend {
  clientId: string
  itemId: string
  note: string | null
}

export interface FaceCard {
  id: string
  gender: 'female' | 'male'
  thumbnailUrl: string
  styleVibe: 'editorial' | 'everyday' | 'corporate' | 'streetwear' | 'traditional'
  skinDepth: SkinDepth
}

export interface POSSummary {
  todayRevenueKES: number
  todayItemsSold: number
  outstandingCount: number
  outstandingKES: number
}
```

---

## 5. Auth & Onboarding (Plan 1)

### Auth screens
Two screens under `/auth`:
- **PhoneEntry** — E.164 phone input + "Send OTP" button → `POST /seller/auth/otp/send`
- **OTPVerify** — 6-digit code input + "Verify" → `POST /seller/auth/otp/verify` → JWT stored → redirect

### Onboarding screens
Two screens under `/onboarding`:
- **BusinessName** — text input for business name
- **BusinessType** — selector for `SellerType` (seller, cobbler, tailor, bag maker, jewellery maker)

On completion: `POST /seller/onboarding/complete` → sets `onboardingDone: true` on profile → redirect to `/inventory`.

Returning seller with valid JWT and complete onboarding → skips directly to `/dashboard`.

### AppShell
Bottom nav with 5 tabs: Dashboard, Inventory, POS, Clients, Profile. Uses React Router `<Outlet />`. Tab icons: consistent with consumer app aesthetic (earth-tone #8B4513 active state, #1A0A00/40 inactive).

### Vite port
`vite.config.ts` `server: { port: 5174 }` — seller runs at `localhost:5174`.

### Vitest setup
Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` to seller devDependencies. Add `vitest.config.ts` matching consumer app pattern.

---

## 6. AI Showcase + Inventory (Plan 2)

### Rendering mode determination
Automatic by category — no seller choice needed:

| Categories | Mode | Description |
|-----------|------|-------------|
| top, bottom, dress, suit, outerwear, jumpsuit | `full_body` | Full avatar with AI face + background |
| hat, headwrap (mapped from `hat`) | `face_neck` | Face and neck, hat rendered on top |
| shoe, bag, jewellery, accessory | `studio` | Clean product shot, no avatar |

### Item creation wizard (4 steps)
1. **Photo** — camera or file input (sellers may upload from gallery, unlike consumers). Flat-lay overlay for clothing; angled guide for shoes. Compress to 500KB on capture.
2. **Details** — item name, category (determines mode), price KES, occasion tags (multi-select chips: casual, office, date, wedding, evening, rain, heat), optional discount (% or KES, optional expiry).
3. **Sizes** — clothing: XS/S/M/L/XL/2XL/3XL chips + quantity per size. Shoes: UK/EU chips + quantity. Bags/accessories/hats: one-size or variant chips. Quantity 0 = out of stock.
4. **AI Showcase** — face library picker (shows 4 cards for trial, full grid for paid) → "Generate Showcase" → 2.5s processing stub → result preview → publish / download / share.

### Face library picker
Card grid: face thumbnail, gender badge, style vibe label. Trial: 2 female + 2 male cards (locked state on all others with upgrade CTA). Paid: full library. Selection persists per generation (not per item).

### Showcase stub
Processing: `setTimeout` 2500ms → returns placeholder image URL (`placehold.co/400x600/{color}/{text}` with item name). Watermark overlay applied as CSS `::after` pseudo-element reading "Style Yangu" for trial + Hustler.

Generation count enforced: if `generationsUsed >= generationsLimit` (and tier is not brand), the "Generate Showcase" button is disabled with "0 generations remaining — upgrade to continue."

### Publish / share actions
After showcase generated:
- **Publish to shop** — `PATCH /seller/inventory/:id` `{ isLive: true }` → item appears on public storefront
- **Download for Instagram** — triggers `<a download>` on the showcase image URL
- **Share to WhatsApp** — `window.open('https://wa.me/?text=...')` with item name, price, and showcase URL

### Inventory list
Card grid (2-col). Filter chips: All, Clothing, Shoes, Hats, Bags. Each card: showcase image (or placeholder), item name, price, stock badge (Live / Sold Out / Low Stock at 1 unit). FAB `+` button navigates to `/inventory/new`.

Item detail (`/inventory/:id`): editable fields, current showcase image, regenerate button (consumes 1 generation), stock adjustment, delete.

---

## 7. POS + Client List (Plan 3)

### POS home (`/pos`)
- Summary card: today's revenue KES, items sold count
- Outstanding payments list: partially paid + owing transactions, sorted newest first
- Recent transactions list (today)
- FAB "Record Sale" → `/pos/new`

### Record sale flow (`/pos/new`, 4 steps)
1. **Item** — search/select from live inventory or type custom item name (for off-platform items)
2. **Price** — listed price pre-filled; seller edits for negotiated price. Both stored.
3. **Payment** — method (M-Pesa / Cash / Bank Transfer / Card), status (Paid / Partially Paid / Owing)
4. **Client (optional)** — search client list by nickname; attach or skip

On confirm: `POST /seller/pos/transactions` → inventory decremented if item selected → WhatsApp receipt option.

WhatsApp receipt message (pre-formatted):
```
Hi [nickname or "there"], thank you for your purchase from [Business Name].
Item: [name]
Amount paid: KES [amount]
Payment: [method]
Date: [date]
Questions? Reply to this message.
Powered by Style Yangu
```
Opens `wa.me/[number]?text=[encoded]`. Number from client record or manual entry.

### Client list (`/clients`)
- List cards: nickname (bold), username (small, muted), last purchase date, try-on stats
- Search bar filters by nickname
- "Add Client" → bottom sheet: Style Yangu username input + nickname input → `POST /seller/clients`
- Client detail (`/clients/:id`): purchase history, try-on engagement (sent / acted), "Send item" button

### Try This On (`/clients/:id`)
- "Send Item" button opens item picker (scrollable list of live inventory items)
- Optional note text input
- Monthly limit badge: "X of Y sends remaining this month" (Hustler: 10, Boutique: 50, Brand: 200)
- At limit: button disabled with upgrade CTA
- On send: `POST /seller/clients/:id/try-on` `{ itemId, note }`

---

## 8. Storefront + Profile + Ad Boost (Plan 4)

### Profile tab (`/profile`)
Sections:
- **Business header** — logo placeholder (avatar circle), business name, tier badge
- **Edit details** — bio, Instagram handle, WhatsApp number, location (inline edit, `PATCH /seller/profile`)
- **Generation meter** — `X of Y showcase generations used this month` (progress bar). Brand tier: "Unlimited".
- **Subscription** — current tier name, renewal date, "Upgrade" button (stubbed — links to pricing page)
- **Storefront** — "View my storefront" external link
- **Sign out** — clears `sy_seller_token`, redirects to `/auth`

### Dashboard tab (`/dashboard`)
- Greeting: "Good morning/afternoon/evening, [Business Name]"
- Stats row: Today's Revenue / Items Sold / Storefront Views
- Quick action buttons: + Add Item, Record Sale, View Storefront
- Analytics card (tier-gated):
  - Hustler: aggregate weekly totals (impressions, saves, follows, Talk to Seller)
  - Boutique+: item-level breakdown table
  - Brand+: full funnel chart (stubbed with placeholder chart)
- Ad Boost teaser (paid tiers): slot usage this week

### Ad Boost section (within Profile tab)
- **Free trial:** hidden — boost section not rendered at all
- **Paid tiers:** shown as a card with:
  - Title: "Ad Boost — Coming Soon"
  - Body: "Reach consumers who match your style profile while they browse outfit suggestions."
  - Base allocation: "X boost slots/week included in your plan"
  - Pack options (Starter / Growth / Campaign) with KES pricing — all disabled, "Coming Soon" label
  - Max Pack: always "Coming Soon"
  - Waitlist CTA: "Join the waitlist" button → `POST /seller/adboost/waitlist` → confirmation toast "You're on the list. We'll notify you when Ad Boost launches."

---

## 9. Tier Enforcement Summary

| Feature | Free Trial | Hustler | Boutique | Brand |
|---------|-----------|---------|----------|-------|
| Showcase generations | 5 total (hard cap) | 20/month | 60/month | Unlimited |
| Face library | 2F + 2M only | Full | Full | Full |
| Watermark on output | Yes (visible) | Yes (subtle) | Reduced | Minimal |
| Inventory items | 10 | 50 | Unlimited | Unlimited |
| POS transactions | 10 | Unlimited | Unlimited | Unlimited |
| Client list + Try This On | Hidden (tab not rendered) | Yes (10/mo) | Yes (50/mo) | Yes (200/mo) |
| Ad Boost | Hidden | Coming Soon + waitlist | Coming Soon + waitlist | Coming Soon + waitlist |
| Schedule/auto-post | No | No | Instagram | Full |
| Analytics | None | Aggregate | Item-level | Full funnel |

`useTierGate(feature)` hook returns `{ allowed: boolean, reason: string }`. Used to disable/hide UI elements. Free trial clients section is fully hidden (no tab rendered if tier is free_trial).

---

## 10. Error Handling

- API errors: toast notification (bottom of screen, 3s auto-dismiss)
- Network errors: retry button in-place (no global error boundary needed at prototype stage)
- Generation cap reached: inline disabled state with upgrade CTA
- OTP errors: inline error message under input
- Form validation: inline under each field (no submit-and-fail pattern)

---

## 11. Testing Strategy

All implementation plans use TDD. Each task: write failing tests → confirm fail → implement → confirm pass → commit.

Test coverage targets (per plan):
- **Plan 1:** Auth screens, AppShell nav, ProtectedRoute guard
- **Plan 2:** Item wizard steps, inventory list, tier gate on generation button
- **Plan 3:** POS flow, client list, try-on send
- **Plan 4:** Dashboard stats, profile edit, ad boost waitlist CTA

Testing patterns mirror consumer app: `vi.spyOn(apiClient, 'get/post/patch')`, `MemoryRouter`, `SellerProvider` wrapper, `waitFor` for async.

---

## 12. File Structure

```
apps/seller/src/
  auth/
    PhoneEntry.tsx
    OTPVerify.tsx
  onboarding/
    BusinessName.tsx
    BusinessType.tsx
    OnboardingWizard.tsx
  context/
    SellerContext.tsx
  hooks/
    useTierGate.ts
    useInventory.ts
    usePOS.ts
    useClients.ts
  components/
    AppShell.tsx
    InventoryCard.tsx
    FaceLibraryPicker.tsx
    ShowcaseResult.tsx
    POSTransactionCard.tsx
    ClientCard.tsx
    AdBoostCard.tsx
    TierBadge.tsx
  pages/
    DashboardTab.tsx
    InventoryTab.tsx
    InventoryNewPage.tsx
    InventoryDetailPage.tsx
    POSTab.tsx
    POSNewPage.tsx
    ClientsTab.tsx
    ClientDetailPage.tsx
    ProfileTab.tsx
  routes/
    index.tsx
    ProtectedRoute.tsx
  __tests__/
    auth/
    inventory/
    pos/
    clients/
    profile/
  App.tsx
  main.tsx
  vite-env.d.ts
```
