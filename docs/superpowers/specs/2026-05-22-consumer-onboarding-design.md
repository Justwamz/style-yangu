# Consumer Onboarding — Design Spec
**Date:** 2026-05-22
**App:** `apps/consumer`
**Spec reference:** StyleYangu_ProdSpec_v4.txt §4.1, §4.2

---

## Overview

Full 11-step onboarding wizard for the Style Yangu consumer PWA. The flow collects everything the suggestion engine needs: account credentials, stylist choice, body type, skin tone, style preferences, wardrobe seed, location, budgets, and shoe size. Ends with an avatar preview that introduces the named stylist.

AI-dependent steps (body selfie, skin tone, wardrobe camera) are fully built with realistic stubs for the prototype — camera UI opens, user photographs, a processing animation runs, mock data resolves. Real AI calls are wired in when `services/ai` is connected.

---

## Architecture

### Routing

Three top-level routes added to the consumer app:

| Route | Behaviour |
|-------|-----------|
| `/` | Auth guard: `sy_token` in localStorage → redirect `/home`; else → redirect `/onboarding` |
| `/onboarding` | Full 11-step wizard (single route, no sub-paths) |
| `/home` | Placeholder screen; destination after onboarding completes |

### OnboardingContext

React context holding `OnboardingState` and a dispatcher. Persisted to localStorage under key `sy_onboarding` on every state change. On app load, state is rehydrated from localStorage so a close or refresh resumes at the correct step.

Cleared from localStorage on onboarding completion (step 11 CTA tap).

### OnboardingWizard (shell component)

Renders:
- Fixed progress bar at top — 11 segments, `#8B4513` fill, `#E8DDD5` track
- Current step component (centred, max-width 430px)
- Back / Next navigation footer — Next is disabled until the current step's required field is present in state

Step transitions: CSS `transform: translateX` slide — forward steps slide in from the right, back steps slide in from the left. No React Router navigation events between steps.

### Step components

All 11 step components are lazy-loaded (`React.lazy` + `Suspense`) to keep the initial bundle small.

---

## Data Model

```typescript
interface OnboardingState {
  step: number                         // 1–11; persisted; resumes on refresh

  // Step 1
  userId?: string
  token?: string

  // Step 2
  stylist?: 'amara' | 'kofi'

  // Steps 3–4
  bodyType?: BodyType                  // stub: 'hourglass'
  avatarCartoonUrl?: string            // stub: placeholder SVG data URL

  // Step 5
  skinProfile?: SkinProfile            // stub: { depth: 'medium', undertone: 'warm', userConfirmed: true }
  hennaDetected?: boolean

  // Step 6
  stylePreferences?: StylePreference[] // min 1 required

  // Step 7
  wardrobeItems?: WardrobeItem[]       // 0–6; skippable

  // Step 8 — lat/lon stored for onboarding session only (avatar preview weather context)
  // Cleared with OnboardingState on completion. Never sent to server. Consistent with spec §12.1 "not stored".
  locationPermission?: 'granted' | 'denied'
  lat?: number
  lon?: number

  // Step 9
  budgets?: Record<string, number>     // KES per ItemCategory; all optional

  // Step 10
  shoeSizeUK?: number
  shoeSizeEU?: number                  // auto-derived via ukToEU util
}

interface WardrobeItem {
  id: string
  photoDataUrl: string
  prompt: string                       // the contextual prompt shown to the user
  tag: 'owned' | 'purchased_planned'  // 'purchased_planned' for Instagram screenshots per spec
}
```

**Step advancement rule:** `step` only increments when the current step's required field is set. Steps 3, 5, and 7 (camera steps) expose a "Skip for now" option — consistent with the spec's allowance for avatar fallback and partial wardrobe at onboarding.

---

## The 11 Steps

### Step 1 — Account Creation

- Email input + password input (min 8 chars)
- "Create Account" CTA — POST `/auth/register` → response stores `userId` and `token` in context + `sy_token` / `sy_user_id` in localStorage
- Google OAuth button: visible, styled, but `disabled` with a tooltip "Coming soon"
- No Apple sign-in (not in PWA prototype scope)
- Error handling: inline error below form ("Email already in use", "Network error — try again")

### Step 2 — Stylist Selection

- Two illustrated cards side by side: Amara (left), Kofi (right)
- Each card shows: illustrated avatar, name, one-line personality from spec
  - Amara: "Warm, honest, direct. Tells you the truth like a trusted friend who always looks put together."
  - Kofi: "Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts."
- Tapping a card applies a `#8B4513` ring; selection stored in context
- Cannot advance without a selection

### Steps 3–4 — Body Selfie + Cartoon Processing

Two sequential sub-screens within one step component:

**Sub-screen A — Forward-facing photo:**
- Instruction: "Stand facing forward, arms slightly away from sides, full body in frame"
- `CameraOverlay` with `full_body` shape (green outline)
- Distance indicator turns green when body fills frame (simulated with a 2s delay in stub)
- Note: "You may need a phone stand or a friend for the next one"
- Capture button → photo stored as dataURL in component state

**Sub-screen B — Side profile photo:**
- Instruction: "Turn to your left and stay in the same spot"
- Same `CameraOverlay`
- Capture button → triggers processing

**Processing animation:**
- Both photos captured → full-screen overlay: "[Stylist name] is getting to know your shape…"
- Animated spinner in `#8B4513`
- 2s delay → stub resolves: `bodyType: 'hourglass'`, `avatarCartoonUrl: <placeholder SVG>`
- Privacy statement shown during processing: "Your selfie is used only to generate your cartoon avatar and is immediately deleted after processing. We never store your actual photo at any point."
- Skippable via "Skip for now" → defaults set, step advances

### Step 5 — Skin Tone Capture

- Camera opens with `hand_oval` overlay
- Instruction: "Place the back of your hand between your wrist and knuckles in the frame"
- Lighting quality indicator active
- Capture → "Checking for henna…" animation (1.5s stub — always returns no henna for prototype)
- Stub resolves: `skinProfile: { depth: 'medium', undertone: 'warm', userConfirmed: false }`
- User sees: detected depth label, undertone label, sample colour palette strip
- Swatch selector (5 depth options × 3 undertone options) to confirm or adjust
- Confirming swatch sets `userConfirmed: true` — swatch selection is always ground truth per spec
- Skippable via "Skip for now"

### Step 6 — Style Preferences

- 6 illustrated tiles in a 2×3 grid:
  - Smart Casual, Business Casual, Streetwear, Traditional & Cultural, Evening & Formal, Athleisure
- Multi-select — tapping toggles selection; `#8B4513` border on selected tiles
- Min 1 selection required to advance
- Tile illustrations: simple CSS/SVG icons for prototype

### Step 7 — Wardrobe Capture

6 sequential sub-screens, one per contextual prompt from spec:
1. "Something you would wear on a rainy day"
2. "Something you would wear on a hot sunny day"
3. "Something you would wear to the office"
4. "Something you would wear on a date"
5. "Something you would wear to a wedding as a guest"
6. "Something casual for a weekend"

Each sub-screen:
- Prompt displayed prominently
- Camera button → opens camera with `flat_lay_rect` overlay + lighting indicator
- Instagram screenshot option below camera button (per spec — tags item as `purchased_planned`)
- "Skip this item" skips to next prompt
- Captured photo compressed to 300KB target via `compressImageToBlob` util

After all 6 prompts (or user taps "Done" after completing at least 0): step advances. Entire step skippable.

### Step 8 — Location Permission

- Single screen explaining benefit: "So Amara/Kofi can factor in today's weather. No location data is stored."
- One CTA: "Allow location" → calls `navigator.geolocation.getCurrentPosition`
- On grant: stores `lat`, `lon`, `locationPermission: 'granted'`
- On deny or dismiss: stores `locationPermission: 'denied'`; app silently falls back to Nairobi coordinates (lat: -1.2921, lon: 36.8219) for weather

### Step 9 — Budget Preferences

- 5 number inputs (KES), one per category: Tops, Bottoms, Shoes, Dresses & Suits, Accessories
- All optional — blank means no budget filter for that category
- Inputs are integer-only; KES prefix displayed
- Stored as `budgets: { top: 2000, shoe: 3000, … }`
- Always advanceable (no required fields)

### Step 10 — Shoe Size

- Two inputs: UK size and EU size
- Auto-converts: changing UK auto-fills EU via `ukToEU()`; changing EU auto-fills UK via `euToUK()`
- Label is gender-neutral per spec: "Your shoe size"
- Both fields filled when either is entered; both stored
- Not required — advanceable without entry (no shoe suggestions until size is set, per spec)

### Step 11 — Avatar Preview

- Shows assembled avatar: cartoon face placeholder + body silhouette representing detected body type + skin tone swatch ring
- Stylist introduced by name with personality line
- Stylist companion avatar displayed alongside consumer avatar per spec §4.2
- CTA: "Meet [Stylist name], let's go" (e.g. "Meet Amara, let's go")
- On tap:
  1. POST `/onboarding/complete` with full `OnboardingState` (fire-and-forget for prototype — no blocking)
  2. Clear `sy_onboarding` from localStorage
  3. Navigate to `/home`

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Registration fails (email taken) | Inline error below form; stay on step 1 |
| Registration fails (network) | Inline error "Network error — try again"; stay on step 1 |
| Camera permission denied (steps 3, 5, 7) | Banner: explains why camera is needed + "Skip this step" button |
| Geolocation denied (step 8) | Silent; stores `locationPermission: 'denied'`; advances; Nairobi default used |
| localStorage unavailable | Context lives in memory only; onboarding not resumable but still completable |

---

## Visual Style

| Token | Value |
|-------|-------|
| Background | `#FDFAF7` |
| Brand primary | `#8B4513` |
| Text primary | `#1A0A00` |
| Card / input border | `#E8DDD5` |
| Progress bar fill | `#8B4513` |
| Progress bar track | `#E8DDD5` |
| Button | `bg-[#8B4513]` white text `rounded-xl` |
| Font | System font stack (no external fonts) |
| Layout | Mobile-first, max-width 430px, centred, full-height |

---

## File Structure

```
apps/consumer/src/
  routes/
    index.tsx              # root router (/, /onboarding, /home)
  pages/
    Home.tsx               # placeholder post-onboarding screen
  onboarding/
    OnboardingContext.tsx  # context + localStorage persistence
    OnboardingWizard.tsx   # shell: progress bar + step renderer + nav
    steps/
      Step01Account.tsx
      Step02Stylist.tsx
      Step03BodySelfie.tsx
      Step05SkinTone.tsx
      Step06StylePrefs.tsx
      Step07Wardrobe.tsx
      Step08Location.tsx
      Step09Budget.tsx
      Step10ShoeSize.tsx
      Step11AvatarPreview.tsx
```

Steps 3–4 are combined in `Step03BodySelfie.tsx` since step 4 (cartoon processing) is an animation within the same screen.

---

## API Endpoints Required

These endpoints are defined and built as part of the implementation plan for this feature:

| Endpoint | Service | Notes |
|----------|---------|-------|
| `POST /auth/register` | `services/api` | Email + password → returns `{ userId, token }` |
| `POST /onboarding/complete` | `services/api` | Stores completed onboarding profile to DB; fire-and-forget from client |

---

## Out of Scope for This Build

- Google OAuth (placeholder button only)
- Real Imagen 3 API calls (stubs only)
- Real Claude API calls for body type / skin tone (stubs only)
- Seller, tailor, admin, reseller apps
- Push notification permission (Phase 5 per spec)
