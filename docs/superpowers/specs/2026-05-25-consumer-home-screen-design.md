# Consumer Home Screen — Design Spec
**Date:** 2026-05-25  
**Spec ref:** StyleYangu_ProdSpec_v4.txt §4.2–4.11  
**Status:** Approved

---

## 1. Scope

Replaces the placeholder `Home.tsx` with a full authenticated consumer experience: bottom navigation shell, five tab pages, shared contexts, custom hooks, and all required API endpoints. Outfit suggestion engine, Imagen 3 processing, and Claude API calls are **stubbed** for the prototype — all stubs must be replaced with live implementations before the project ships.

---

## 2. Architecture

### 2.1 Routing

Current route `/home` is replaced with a nested route structure:

```
/home              → AppShell (bottom nav)
/home/             → HomeTab (default)
/home/wardrobe     → WardrobeTab
/home/style        → StyleTab
/home/discover     → DiscoverTab
/home/profile      → ProfileTab
```

`AppShell.tsx` renders the bottom navigation bar and an `<Outlet />`. The `AuthGuard` already redirects authenticated users to `/home`.

### 2.2 Bottom Navigation

Five tabs in order:

| Tab | Icon | Route |
|-----|------|-------|
| Home | house | `/home/` |
| Wardrobe | shirt | `/home/wardrobe` |
| Style | star | `/home/style` |
| Discover | compass | `/home/discover` |
| Profile | person | `/home/profile` |

### 2.3 Shared Contexts

Located in `apps/consumer/src/context/`:

- **`ProfileContext`** — user profile, avatar URL, stylist name (`amara` | `kofi`), gender, skin tone, body type, sizes. Initialized at `AppShell` mount.
- **`SuggestionContext`** — today's suggestions array, unlock count (0–3), ad phase (1 | 2), unlock mode flag (idle | wardrobe-unlock | done).

### 2.4 Custom Hooks

Located in `apps/consumer/src/hooks/`:

| Hook | Endpoint | Purpose |
|------|----------|---------|
| `useProfile()` | `GET /consumer/profile` | Fetches and caches user profile |
| `useSuggestion()` | `GET /consumer/suggestion/daily` + `POST /consumer/suggestion/unlock` | Daily suggestion + unlock flow |
| `useWeather()` | `GET /consumer/weather` | Weather with simulation support |
| `useWardrobe()` | `GET /consumer/wardrobe` | Item grid + add-item mutation |
| `useReferral()` | `GET /consumer/referral` | Invite link + counters |
| `useStreak()` | `GET /consumer/streak` | Gamification data |

All hooks expose `{ data, loading, error }` at minimum.

---

## 3. API Endpoints (New)

All endpoints require `Authorization: Bearer <token>`. Added to `services/api`.

### Consumer profile
```
GET /consumer/profile
Response: { avatarUrl, stylistName, gender, skinTone, bodyType, shoeSize, stylePrefs, budget, location }
```

### Daily suggestion
```
GET /consumer/suggestion/daily
Response: { suggestions: [{ id, outfit, stylistComment, occasionTag, clothingTags }], unlockCount, phase }
```
Suggestion content is **stubbed** — returns realistic hardcoded outfit combinations matched to gender and style preferences.

### Unlock suggestion
```
POST /consumer/suggestion/unlock
Body: { method: 'ad' | 'wardrobe', adId?: string, wardrobeItemIds?: string[] }
Response: { unlockCount, remaining }
```
Enforces 3/day hard cap server-side. Wardrobe method requires exactly 2 item IDs.

### Weather
```
GET /consumer/weather
Response: { temp, condition, windSpeed, humidity, timeOfDay, simulated: boolean }
```
Checks if the requesting user has a simulation override active in the DB (written by admin dashboard §13.5). If simulation is active, returns simulated payload. Otherwise proxies OpenWeatherMap using the lat/lon stored from onboarding Step 8. Response cached for 30 minutes per user.

### Wardrobe
```
GET /consumer/wardrobe?category=all&page=1
Response: { items: [{ id, photoUrl, tags, category, occasionTags }], total }

POST /consumer/wardrobe/item
Body: multipart/form-data { photo, unlockSessionId? }
Response: { item: { id, photoUrl, tags }, unlockProgress?: { count, required } }
```

### Discover feed
```
GET /consumer/discover
Response: { items: [{ id, name, price, sellerName, photoUrl, sponsored, matchReason }] }
```
Stub returns gender-appropriate items. Frequency cap state (1/seller/day, 3/seller/week) enforced server-side.

### Referral
```
GET /consumer/referral
Response: { code, expiresAt, shareUrl, counters: { totalClicks, totalJoined, awaitingUpgrade, upgradedThisMonth } }
```
Generates a new 14-day code on first call if none exists.

### Streak + gamification
```
GET /consumer/streak
Response: { streakDays, stylePoints, weeklyScore, leaderboardRank }
```
Values seeded realistically from onboarding date for prototype.

### Preferences
```
PATCH /consumer/preferences
Body: { notificationFrequency: 'immediate' | 'daily' | 'weekly' }
Response: { ok: true }
```

---

## 4. Tab Designs

### 4.1 Home Tab

**Stylist greeting card** — stylist avatar + name, contextual greeting by time of day (morning/afternoon/evening). Fetches from `ProfileContext`.

**Weather banner** — condition icon + temperature. Expands with stylist warning text if the suggestion's `clothingTags` trigger a weather conflict (§4.5 rules: loose skirts + wind, suede shoes + rain, heavy layers + extreme heat, etc.). Three warning levels:
1. Icon + stylist text
2. Avatar animation stub (static for prototype)
3. Hard block + wardrobe alternative suggestions

Warning logic runs client-side against the suggestion's `clothingTags` and weather `condition`.

**Suggestion card** — outfit combination, occasion tag, "Why this works" stylist comment referencing skin tone and body type. Follow-on prompts appear sequentially:
- "Would [Stylist] suggest shoes?" — only if wardrobe has ≥1 shoe
- "Would [Stylist] suggest a hat?" — only if wardrobe has ≥1 hat

**Unlock mechanic** — visible after first suggestion, hidden when cap (3) reached:
- **Watch a look** — sponsored card displayed for 3 seconds (Phase 2 stub, gender-matched content). Awards +1 suggestion. Max 2 ads/day.
- **Add 2 items** — navigates to Wardrobe tab in unlock mode. Two camera captures = +1 suggestion. Can repeat once more.
- Methods can be mixed to reach cap.

### 4.2 Wardrobe Tab

**Grid** — photo cards with category tag and occasion badges. Fetched from `GET /consumer/wardrobe`. Client-side filter chips: All, Tops, Bottoms, Dresses, Shoes, Hats, Accessories.

**Add item FAB** — camera icon bottom-right. Opens camera with flat-lay overlay + lighting quality indicator (reused from onboarding Step 7). Camera only — no gallery upload. On capture: compress → `POST /consumer/wardrobe/item` → AI tag stub → item appears in grid.

**Unlock mode** — activated when user arrives from Home tab unlock flow. Banner: "Add 2 items to unlock a suggestion — X/2 captured." Counter updates on each successful capture. On second capture, unlock awarded, user returned to Home tab.

### 4.3 Style Tab

Two entry cards:

**Rate My Outfit**
1. Camera opens on tap
2. Processing stub: spinner with "Amara is reviewing your look…" (simulates Imagen 3)
3. Result screen: stubbed cartoon avatar image, five scores (Colour Harmony, Fit, Occasion Match, Weather Match, Cohesion) out of 10, overall score, one stylist feedback line (clothing only — never body)
4. Score < 6: "Fix it" section with 2–3 wardrobe alternatives from user's actual items
5. Share card: cartoon avatar, overall score, positive stylist line, weather + occasion context, Style Yangu watermark. Web Share API targets: WhatsApp, Instagram Stories, copy link.

**Fabric Design Tool**
1. Entry choice: photograph fabric OR screenshot from gallery (only gallery-permitted flow in the app)
2. Claude Sonnet stub: detects pattern, colour, texture → shows fabric summary
3. Garment type selector: sundress, maxi dress, skirt, jumpsuit, shirt dress, co-ord set, buibui, kitenge wrap dress, leso, other
4. Imagen 3 stub: renders silhouette on user's avatar; skin tone comment from stylist
5. Fabric metres estimate displayed
6. "Send to Tailor" — shows "Coming soon" for prototype (tailor matching is Phase 2 of tailor app)

### 4.4 Discover Tab

Scrollable feed of matched seller items from `GET /consumer/discover`. Each card:
- Item photo, name, price in KES, seller name
- Stylist attribution line (e.g. "Amara found something for you")
- Sponsored badge where applicable
- **Talk to Seller** — pre-populated WhatsApp stub message with item name + size
- **Follow** — follows seller storefront, confirmed with toast
- **Save to Wishlist** — heart icon fills, count visible in Profile

Stub data is gender-appropriate and reflects style preferences. Frequency caps (1/seller/day, 3/seller/week) enforced server-side per §4.4.3.

### 4.5 Profile Tab

- **Avatar section** — cartoon avatar + stylist avatar side by side, subscription badge (Free / Premium)
- **Gamification** — streak counter (flame icon), style points, weekly score, leaderboard rank teaser. Seeded from `GET /consumer/streak`.
- **Referral section** — active invite link, share button (WhatsApp / Instagram Stories / copy link), four counters: Total Clicks, Total Joined, Awaiting Upgrade, Upgraded This Month. Share card: avatar + streak + stylist name.
- **Notification preferences** — toggle between Immediate, Daily Digest, Weekly Roundup. Persisted via `PATCH /consumer/preferences`.
- **Wardrobe stats** — total items, category breakdown, link to Wardrobe tab.
- **Sign out** — clears `sy_token` from localStorage, redirects to `/onboarding`.

---

## 5. Weather Warning Logic (client-side)

| Condition | Clothing tags that trigger warning | Stylist tone |
|-----------|-----------------------------------|--------------|
| Windy | `loose-skirt`, `wide-leg-trousers`, `oversized-shirt` | Playful |
| Rainy | `suede`, `white-linen`, `open-toe`, `flared-hem` | Practical, firm |
| Extreme heat | `heavy-layer`, `dark-colour`, `synthetic` | Caring |
| Cold | `bare-legs`, `thin-fabric` (outdoor occasion) | Concerned |
| Humid | `natural-hair-style`, `non-breathable` | Knowing, sympathetic |

---

## 6. Sponsored Card Stub Spec

Phase 2 stubs are gender-matched:
- **Female profiles:** dresses, blouses, skirts, heels, handbags
- **Male profiles:** shirts, trousers, suits, loafers, belts

Each stub card carries: item name, price in KES, seller name, a photo URL (placeholder), and a `sponsored: true` flag. Cards rotate through a small pool (5–10 items) to avoid repetition. Frequency cap state tracked server-side.

---

## 7. Testing

- Unit tests for weather warning logic (all 5 condition/tag combinations)
- Unit tests for unlock mechanic state machine (phase, count, cap enforcement)
- Unit tests for `useProfile`, `useSuggestion`, `useWeather` hooks (mock API responses)
- Integration test: full suggestion → unlock → second suggestion flow
- Integration test: wardrobe camera add → unlock credit awarded
- Referral code generation and counter increment tests

---

## 8. Stubs to Replace Before Ship

| Stub | Real implementation |
|------|-------------------|
| Outfit suggestion content | Claude Sonnet via `services/ai` |
| Imagen 3 cartoon (Rate My Outfit) | Imagen 3 via `services/ai` |
| Imagen 3 fabric render | Imagen 3 via `services/ai` |
| Claude fabric analysis | Claude Sonnet via `services/ai` |
| Sponsored card content | Live ad boost matching via `services/ads` |
| Discover feed items | Live seller inventory matching |
| Streak + gamification values | Real usage tracking |
| Talk to Seller WhatsApp | Live WhatsApp Business API via `services/notifications` |
| Weather API | Live OpenWeatherMap proxy (endpoint structure already correct) |
