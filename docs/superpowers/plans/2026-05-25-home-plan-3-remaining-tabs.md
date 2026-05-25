# Consumer Home Screen — Plan 3: Wardrobe, Style, Discover & Profile Tabs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four placeholder tab pages (Wardrobe, Style, Discover, Profile) with their full implementations per the design spec.

**Architecture:** Each tab is a self-contained page component that composes smaller components. Hooks from Plan 2 supply data. The Wardrobe tab integrates with the SuggestionContext unlock flow. The Style tab hosts Rate My Outfit and Fabric Design Tool entry points with stubbed AI processing. The Discover tab renders the gender-matched feed. The Profile tab surfaces gamification, referral, and notification preferences.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Vitest, Testing Library, Web Share API

**Prerequisite:** Plans 1 and 2 must be complete.

---

### Task 1: Wardrobe tab (TDD)

**Files:**
- Create: `apps/consumer/src/components/WardrobeCameraCapture.tsx`
- Modify: `apps/consumer/src/pages/WardrobeTab.tsx`
- Create: `apps/consumer/src/__tests__/WardrobeTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/consumer/src/__tests__/WardrobeTab.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import WardrobeTab from '../pages/WardrobeTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockItems = [
  { id: 'w1', photoUrl: 'https://placehold.co/300x300', category: 'clothing', occasionTags: ['casual'], source: 'onboarding' as const },
  { id: 'w2', photoUrl: 'https://placehold.co/300x300', category: 'shoe', occasionTags: ['casual'], source: 'added' as const },
]

function renderWardrobeTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <WardrobeTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path.startsWith('/consumer/wardrobe')) return Promise.resolve({ items: mockItems, total: 2 })
    if (path === '/consumer/profile') return Promise.resolve({ stylistName: 'amara', avatarUrl: null, skinTone: null, bodyType: null, shoeSize: { uk: 6, eu: 39 }, stylePrefs: [], budget: {}, location: { lat: null, lon: null }, tier: 'free' })
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    return Promise.resolve({})
  })
})

describe('WardrobeTab', () => {
  it('renders wardrobe items from API', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
  })

  it('shows total item count', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getByText(/2 item/i)).toBeInTheDocument())
  })

  it('shows filter chips', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument())
  })

  it('shows add item button', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/WardrobeTab.test.tsx
```

Expected: FAIL — WardrobeTab is placeholder.

- [ ] **Step 3: Create `apps/consumer/src/components/WardrobeCameraCapture.tsx`**

```typescript
import { useRef, useState, useEffect } from 'react'
import { CameraOverlay } from '@style-yangu/ui'
import { compressImageToBlob } from '@style-yangu/utils'

interface Props {
  onCapture: (photoDataUrl: string) => void
  onCancel: () => void
}

export default function WardrobeCameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streamError, setStreamError] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    const blob = await compressImageToBlob(dataUrl, 300)
    const compressed = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    onCapture(compressed)
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {streamError ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-sm">Camera access required to add wardrobe items.</p>
        </div>
      ) : (
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <CameraOverlay shape="flat_lay_rect" lightingQuality="good" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      <div className="flex gap-3 p-4 bg-black">
        <button
          onClick={onCancel}
          className="flex-1 border border-white/30 text-white rounded-xl py-3 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={capture}
          disabled={streamError}
          className="flex-1 bg-white text-black rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
        >
          Capture
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `apps/consumer/src/pages/WardrobeTab.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWardrobe } from '../hooks/useWardrobe'
import { useSuggestionContext } from '../context/SuggestionContext'
import WardrobeCameraCapture from '../components/WardrobeCameraCapture'
import type { WardrobeItem } from '@style-yangu/types'

const CATEGORIES = ['all', 'clothing', 'shoe', 'hat', 'bag', 'accessory']

export default function WardrobeTab() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [showCamera, setShowCamera] = useState(false)
  const { items, total, loading, addItem } = useWardrobe(activeCategory)
  const { unlockState, dispatchUnlock, unlockByWardrobe } = useSuggestionContext()

  const isUnlockMode = unlockState.unlockMode === 'wardrobe-unlock'
  const [capturedInSession, setCapturedInSession] = useState<string[]>([])

  async function handleCapture(photoDataUrl: string) {
    setShowCamera(false)
    const item = await addItem(photoDataUrl)

    if (isUnlockMode) {
      const next = [...capturedInSession, item.id]
      setCapturedInSession(next)
      dispatchUnlock({ type: 'WARDROBE_ITEM_CAPTURED' })

      if (next.length >= 2) {
        await unlockByWardrobe([next[0], next[1]] as [string, string])
        setCapturedInSession([])
        navigate('/home/')
      }
    }
  }

  function handleCancel() {
    setShowCamera(false)
    if (isUnlockMode) dispatchUnlock({ type: 'CANCEL_WARDROBE_UNLOCK' })
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {isUnlockMode && (
        <div className="mb-4 bg-[#F5EDE5] rounded-2xl p-3 border border-[#8B4513]/20">
          <p className="text-sm font-semibold text-[#8B4513]">
            Add 2 items to unlock a suggestion — {capturedInSession.length}/2 captured
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#1A0A00]">My Wardrobe</h1>
        <p className="text-sm text-[#1A0A00]/50">{total} item{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#8B4513] text-white'
                : 'bg-white border border-[#E8DDD5] text-[#1A0A00]'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sm text-[#1A0A00]/40 py-8">Loading wardrobe...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-[#1A0A00]/40 py-8">No items in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-20">
          {items.map((item: WardrobeItem) => (
            <div key={item.id} className="aspect-square rounded-2xl overflow-hidden border border-[#E8DDD5] bg-[#F5EDE5]">
              <img src={item.photoUrl} alt="Wardrobe item" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowCamera(true)}
        aria-label="Add item"
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#8B4513] text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
      >
        📷
      </button>

      {showCamera && (
        <WardrobeCameraCapture onCapture={handleCapture} onCancel={handleCancel} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/WardrobeTab.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/consumer/src/components/WardrobeCameraCapture.tsx apps/consumer/src/pages/WardrobeTab.tsx apps/consumer/src/__tests__/WardrobeTab.test.tsx
git commit -m "feat(consumer): Wardrobe tab — grid, camera capture, unlock mode integration"
```

---

### Task 2: Style tab — Rate My Outfit + Fabric Design Tool (TDD)

**Files:**
- Create: `apps/consumer/src/components/RateMyOutfit.tsx`
- Create: `apps/consumer/src/components/FabricDesignTool.tsx`
- Modify: `apps/consumer/src/pages/StyleTab.tsx`
- Create: `apps/consumer/src/__tests__/StyleTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/consumer/src/__tests__/StyleTab.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StyleTab from '../pages/StyleTab'

function renderStyleTab() {
  return render(<MemoryRouter><StyleTab /></MemoryRouter>)
}

describe('StyleTab', () => {
  it('shows Rate My Outfit entry card', () => {
    renderStyleTab()
    expect(screen.getByText(/rate my outfit/i)).toBeInTheDocument()
  })

  it('shows Fabric Design Tool entry card', () => {
    renderStyleTab()
    expect(screen.getByText(/fabric design/i)).toBeInTheDocument()
  })

  it('shows description for Rate My Outfit', () => {
    renderStyleTab()
    expect(screen.getByText(/photo.*rated/i)).toBeInTheDocument()
  })

  it('shows description for Fabric Design', () => {
    renderStyleTab()
    expect(screen.getByText(/fabric.*tailor/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/StyleTab.test.tsx
```

Expected: FAIL — placeholder content doesn't match.

- [ ] **Step 3: Create `apps/consumer/src/components/RateMyOutfit.tsx`**

```typescript
import { useRef, useState } from 'react'

const CATEGORIES = ['Colour Harmony', 'Fit', 'Occasion Match', 'Weather Match', 'Cohesion'] as const

interface RatingResult {
  scores: Record<typeof CATEGORIES[number], number>
  overall: number
  stylistFeedback: string
  photoDataUrl: string
}

const STUB_RESULT: RatingResult = {
  scores: { 'Colour Harmony': 8, 'Fit': 7, 'Occasion Match': 8, 'Weather Match': 9, 'Cohesion': 7 },
  overall: 8,
  stylistFeedback: 'The palette works really well together. The layering adds depth without overwhelming the look.',
  photoDataUrl: 'https://placehold.co/300x400/8B4513/FFFFFF?text=Your+Outfit',
}

export default function RateMyOutfit() {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<'idle' | 'camera' | 'processing' | 'result'>('idle')
  const [result, setResult] = useState<RatingResult | null>(null)

  async function startCamera() {
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setStep('idle')
    }
  }

  function captureAndProcess() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const stream = video.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())
    setStep('processing')
    setTimeout(() => {
      setResult(STUB_RESULT)
      setStep('result')
    }, 2500)
  }

  async function share() {
    if (!result) return
    const text = `My outfit scored ${result.overall}/10 on Style Yangu! ✨`
    if (navigator.share) {
      await navigator.share({ title: 'My Style Score', text }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(text).catch(() => undefined)
    }
  }

  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex gap-3 p-4 bg-black">
          <button onClick={() => setStep('idle')} className="flex-1 border border-white/30 text-white rounded-xl py-3 text-sm">Cancel</button>
          <button onClick={captureAndProcess} className="flex-1 bg-white text-black rounded-xl py-3 font-semibold text-sm">Capture</button>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
        <div className="w-16 h-16 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#1A0A00]/70">Your stylist is reviewing your look…</p>
      </div>
    )
  }

  if (step === 'result' && result) {
    return (
      <div className="flex flex-col gap-4">
        <img src={result.photoDataUrl} alt="Your outfit" className="w-full aspect-[3/4] object-cover rounded-2xl" />
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[#1A0A00] text-lg">Overall: {result.overall}/10</p>
            <button onClick={() => setStep('idle')} className="text-xs text-[#1A0A00]/50">Retake</button>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center justify-between py-1.5 border-b border-[#E8DDD5] last:border-0">
              <span className="text-sm text-[#1A0A00]">{cat}</span>
              <span className="text-sm font-medium text-[#8B4513]">{result.scores[cat]}/10</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#1A0A00]/70 italic px-1">"{result.stylistFeedback}"</p>
        <button onClick={share} className="w-full bg-[#8B4513] text-white rounded-xl py-3 font-semibold">
          Share my score
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startCamera}
      className="w-full bg-[#8B4513] text-white rounded-xl py-3 font-semibold text-sm"
    >
      Take a photo to rate
    </button>
  )
}
```

- [ ] **Step 4: Create `apps/consumer/src/components/FabricDesignTool.tsx`**

```typescript
import { useRef, useState } from 'react'

const GARMENT_TYPES = [
  'Sundress', 'Maxi Dress', 'Skirt', 'Jumpsuit',
  'Shirt Dress', 'Co-ord Set', 'Buibui', 'Kitenge Wrap Dress', 'Leso', 'Other',
]

type Step = 'idle' | 'analysis' | 'garment-select' | 'render'

interface FabricAnalysis {
  pattern: string
  colours: string[]
  texture: string
  stylistComment: string
}

const STUB_ANALYSIS: FabricAnalysis = {
  pattern: 'Geometric Kitenge print',
  colours: ['Terracotta', 'Cream', 'Forest Green'],
  texture: 'Medium weight cotton',
  stylistComment: 'This warm terracotta print works beautifully with your undertone. A wrap silhouette will complement your proportions.',
}

export default function FabricDesignTool() {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [analysis, setAnalysis] = useState<FabricAnalysis | null>(null)
  const [garment, setGarment] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'camera' | 'gallery' | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('analysis')
    setTimeout(() => { setAnalysis(STUB_ANALYSIS); setStep('garment-select') }, 2000)
  }

  async function startCamera() {
    setInputMode('camera')
    setStep('analysis')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) { videoRef.current.srcObject = stream }
    } catch {
      setStep('idle')
    }
    setTimeout(() => { setAnalysis(STUB_ANALYSIS); setStep('garment-select') }, 2000)
  }

  function selectGarment(type: string) {
    setGarment(type)
    setStep('render')
  }

  if (step === 'analysis') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-12 h-12 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#1A0A00]/70">Analysing your fabric…</p>
      </div>
    )
  }

  if (step === 'garment-select' && analysis) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-[#F5EDE5] rounded-2xl p-4">
          <p className="font-semibold text-[#1A0A00] text-sm">{analysis.pattern}</p>
          <p className="text-xs text-[#1A0A00]/60 mt-1">{analysis.colours.join(', ')} · {analysis.texture}</p>
          <p className="text-xs text-[#8B4513] mt-2 italic">{analysis.stylistComment}</p>
        </div>
        <p className="text-sm font-semibold text-[#1A0A00]">Choose a garment type:</p>
        <div className="grid grid-cols-2 gap-2">
          {GARMENT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => selectGarment(type)}
              className="border border-[#E8DDD5] rounded-xl py-2.5 text-sm text-[#1A0A00] hover:border-[#8B4513] hover:text-[#8B4513] transition-colors"
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'render' && analysis && garment) {
    const metres = garment.toLowerCase().includes('maxi') || garment.toLowerCase().includes('dress') ? '3.5m' : '2m'
    return (
      <div className="flex flex-col gap-4">
        <img
          src={`https://placehold.co/300x400/8B4513/FFFFFF?text=${encodeURIComponent(garment)}`}
          alt={`${garment} render`}
          className="w-full aspect-[3/4] object-cover rounded-2xl"
        />
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <p className="font-semibold text-[#1A0A00]">{garment}</p>
          <p className="text-sm text-[#1A0A00]/60 mt-1">{analysis.pattern}</p>
          <p className="text-sm text-[#1A0A00]/60 mt-0.5">Estimated fabric: {metres}</p>
          <p className="text-xs text-[#8B4513] mt-2 italic">{analysis.stylistComment}</p>
        </div>
        <button
          className="w-full border border-[#E8DDD5] rounded-xl py-3 text-sm text-[#1A0A00]/50"
          disabled
        >
          Send to Tailor — Coming soon
        </button>
        <button onClick={() => setStep('idle')} className="w-full bg-[#8B4513] text-white rounded-xl py-3 font-semibold text-sm">
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={startCamera}
        className="w-full bg-[#8B4513] text-white rounded-xl py-3 font-semibold text-sm"
      >
        Photograph fabric
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full border border-[#E8DDD5] rounded-xl py-3 text-sm text-[#1A0A00]"
      >
        Upload screenshot
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
```

- [ ] **Step 5: Implement `apps/consumer/src/pages/StyleTab.tsx`**

```typescript
import { useState } from 'react'
import RateMyOutfit from '../components/RateMyOutfit'
import FabricDesignTool from '../components/FabricDesignTool'

type ActiveTool = null | 'rate' | 'fabric'

export default function StyleTab() {
  const [active, setActive] = useState<ActiveTool>(null)

  if (active === 'rate') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={() => setActive(null)} className="mb-4 text-sm text-[#8B4513]">← Back</button>
        <h1 className="text-xl font-bold text-[#1A0A00] mb-4">Rate My Outfit</h1>
        <RateMyOutfit />
      </div>
    )
  }

  if (active === 'fabric') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={() => setActive(null)} className="mb-4 text-sm text-[#8B4513]">← Back</button>
        <h1 className="text-xl font-bold text-[#1A0A00] mb-4">Fabric Design Tool</h1>
        <FabricDesignTool />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold text-[#1A0A00]">Style</h1>

      <button
        onClick={() => setActive('rate')}
        className="w-full bg-white rounded-2xl border border-[#E8DDD5] p-5 text-left shadow-sm"
      >
        <p className="text-2xl mb-2">⭐</p>
        <p className="font-bold text-[#1A0A00]">Rate My Outfit</p>
        <p className="text-sm text-[#1A0A00]/60 mt-1">
          Get your photo rated across 5 style categories by your personal stylist.
        </p>
      </button>

      <button
        onClick={() => setActive('fabric')}
        className="w-full bg-white rounded-2xl border border-[#E8DDD5] p-5 text-left shadow-sm"
      >
        <p className="text-2xl mb-2">🪡</p>
        <p className="font-bold text-[#1A0A00]">Fabric Design Tool</p>
        <p className="text-sm text-[#1A0A00]/60 mt-1">
          Photograph any fabric and see it turned into a garment — then send the brief to a tailor.
        </p>
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Run tests**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/StyleTab.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/consumer/src/components/RateMyOutfit.tsx apps/consumer/src/components/FabricDesignTool.tsx apps/consumer/src/pages/StyleTab.tsx apps/consumer/src/__tests__/StyleTab.test.tsx
git commit -m "feat(consumer): Style tab — Rate My Outfit and Fabric Design Tool"
```

---

### Task 3: Discover tab (TDD)

**Files:**
- Create: `apps/consumer/src/components/DiscoverCard.tsx`
- Modify: `apps/consumer/src/pages/DiscoverTab.tsx`
- Create: `apps/consumer/src/__tests__/DiscoverTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/consumer/src/__tests__/DiscoverTab.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import DiscoverTab from '../pages/DiscoverTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockItems = [
  { id: 'd1', name: 'Emerald Wrap Dress', priceKES: 2800, sellerName: 'NairobiChic', photoUrl: 'https://placehold.co/400x500', sponsored: false, matchReason: 'Matches your style' },
  { id: 'd2', name: 'Kitenge Skirt', priceKES: 1800, sellerName: 'AfricanPride', photoUrl: 'https://placehold.co/400x500', sponsored: true, matchReason: 'Traditional style preference' },
]

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path === '/consumer/discover') return Promise.resolve({ items: mockItems })
    if (path === '/consumer/profile') return Promise.resolve({ stylistName: 'amara', avatarUrl: null, skinTone: null, bodyType: null, shoeSize: { uk: 6, eu: 39 }, stylePrefs: [], budget: {}, location: { lat: null, lon: null }, tier: 'free' })
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    return Promise.resolve({})
  })
})

function renderDiscoverTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <DiscoverTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

describe('DiscoverTab', () => {
  it('renders discover items from API', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText('Emerald Wrap Dress')).toBeInTheDocument())
  })

  it('shows seller name', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText('NairobiChic')).toBeInTheDocument())
  })

  it('shows price in KES', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText(/KES 2,800/)).toBeInTheDocument())
  })

  it('shows Sponsored badge on sponsored items', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText('Sponsored')).toBeInTheDocument())
  })

  it('shows Talk to Seller button', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getAllByRole('button', { name: /talk to seller/i }).length).toBeGreaterThan(0))
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/DiscoverTab.test.tsx
```

Expected: FAIL — placeholder content.

- [ ] **Step 3: Create `apps/consumer/src/components/DiscoverCard.tsx`**

```typescript
import { useState } from 'react'
import type { DiscoverItem } from '@style-yangu/types'

interface Props {
  item: DiscoverItem
  stylistName: string
}

export default function DiscoverCard({ item, stylistName }: Props) {
  const [wishlisted, setWishlisted] = useState(false)
  const [followed, setFollowed] = useState(false)
  const name = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)

  function talkToSeller() {
    const msg = encodeURIComponent(
      `Hi, I'm enquiring about "${item.name}" (KES ${item.priceKES.toLocaleString()}) that I found on Style Yangu.`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8DDD5] overflow-hidden shadow-sm">
      <div className="relative">
        <img src={item.photoUrl} alt={item.name} className="w-full aspect-[4/5] object-cover" />
        {item.sponsored && (
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            Sponsored
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-[#8B4513] mb-1">{name} found this for you</p>
        <p className="font-semibold text-[#1A0A00] text-sm">{item.name}</p>
        <p className="text-sm text-[#1A0A00]/60">KES {item.priceKES.toLocaleString()} · {item.sellerName}</p>
        <p className="text-xs text-[#1A0A00]/50 mt-1">{item.matchReason}</p>
        <button
          onClick={talkToSeller}
          className="mt-3 w-full bg-[#8B4513] text-white rounded-xl py-2 text-sm font-medium"
        >
          Talk to Seller
        </button>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setFollowed(f => !f)}
            className={`flex-1 border rounded-xl py-1.5 text-xs transition-colors ${followed ? 'border-[#8B4513] text-[#8B4513]' : 'border-[#E8DDD5] text-[#1A0A00]/60'}`}
          >
            {followed ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => setWishlisted(w => !w)}
            className={`flex-1 border rounded-xl py-1.5 text-xs transition-colors ${wishlisted ? 'border-[#8B4513] text-[#8B4513]' : 'border-[#E8DDD5] text-[#1A0A00]/60'}`}
          >
            {wishlisted ? '♥ Saved' : '♡ Wishlist'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `apps/consumer/src/pages/DiscoverTab.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import { useProfileContext } from '../context/ProfileContext'
import DiscoverCard from '../components/DiscoverCard'
import type { DiscoverItem } from '@style-yangu/types'

export default function DiscoverTab() {
  const { profile } = useProfileContext()
  const [items, setItems] = useState<DiscoverItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<{ items: DiscoverItem[] }>('/consumer/discover')
      .then(data => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  const stylistName = profile?.stylistName ?? 'amara'

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#1A0A00] mb-4">Discover</h1>
      {loading ? (
        <p className="text-center text-sm text-[#1A0A00]/40 py-8">Finding items for you…</p>
      ) : (
        <div className="flex flex-col gap-4 pb-6">
          {items.map(item => (
            <DiscoverCard key={item.id} item={item} stylistName={stylistName} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/DiscoverTab.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/consumer/src/components/DiscoverCard.tsx apps/consumer/src/pages/DiscoverTab.tsx apps/consumer/src/__tests__/DiscoverTab.test.tsx
git commit -m "feat(consumer): Discover tab — gender-matched feed, Talk to Seller, Follow, Wishlist"
```

---

### Task 4: Profile tab (TDD)

**Files:**
- Modify: `apps/consumer/src/pages/ProfileTab.tsx`
- Create: `apps/consumer/src/__tests__/ProfileTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/consumer/src/__tests__/ProfileTab.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import ProfileTab from '../pages/ProfileTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockProfile = { stylistName: 'amara' as const, avatarUrl: null, skinTone: null, bodyType: null, shoeSize: { uk: 6, eu: 39 }, stylePrefs: [], budget: {}, location: { lat: null, lon: null }, tier: 'free' as const }
const mockStreak = { streakDays: 5, stylePoints: 65, weeklyScore: 7.4, leaderboardRank: 12 }
const mockReferral = { code: 'ABC12345', expiresAt: new Date(Date.now() + 86400000 * 13).toISOString(), shareUrl: 'https://styleyangu.app/join/ABC12345', counters: { totalClicks: 3, totalJoined: 1, awaitingUpgrade: 1, upgradedThisMonth: 0 } }

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path === '/consumer/profile') return Promise.resolve(mockProfile)
    if (path === '/consumer/streak') return Promise.resolve(mockStreak)
    if (path === '/consumer/referral') return Promise.resolve(mockReferral)
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    return Promise.resolve({})
  })
  vi.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({ ok: true })
})

function renderProfileTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <ProfileTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

describe('ProfileTab', () => {
  it('shows stylist name', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText(/amara/i)).toBeInTheDocument())
  })

  it('shows streak count', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText(/5/)).toBeInTheDocument())
  })

  it('shows referral code', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText('ABC12345')).toBeInTheDocument())
  })

  it('shows notification preference options', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText(/immediate/i)).toBeInTheDocument())
  })

  it('calls PATCH on preference change', async () => {
    const patchSpy = vi.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({ ok: true })
    renderProfileTab()
    await waitFor(() => screen.getByText(/daily digest/i))
    await userEvent.click(screen.getByText(/daily digest/i))
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/consumer/preferences', { notificationFrequency: 'daily' }))
  })

  it('shows sign out button', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/ProfileTab.test.tsx
```

Expected: FAIL — placeholder content.

- [ ] **Step 3: Implement `apps/consumer/src/pages/ProfileTab.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@style-yangu/api-client'
import { useProfileContext } from '../context/ProfileContext'
import { useStreak } from '../hooks/useStreak'
import { useReferral } from '../hooks/useReferral'

type NotifFreq = 'immediate' | 'daily' | 'weekly'

const NOTIF_OPTIONS: { value: NotifFreq; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily',     label: 'Daily Digest' },
  { value: 'weekly',    label: 'Weekly Roundup' },
]

export default function ProfileTab() {
  const navigate = useNavigate()
  const { profile } = useProfileContext()
  const { streak } = useStreak()
  const { referral } = useReferral()
  const [notifFreq, setNotifFreq] = useState<NotifFreq>('immediate')

  const stylistName = profile?.stylistName ?? 'amara'
  const stylistDisplay = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)

  async function handleNotifChange(freq: NotifFreq) {
    setNotifFreq(freq)
    await apiClient.patch('/consumer/preferences', { notificationFrequency: freq }).catch(() => undefined)
  }

  function signOut() {
    localStorage.removeItem('sy_token')
    localStorage.removeItem('sy_user_id')
    navigate('/onboarding')
  }

  async function shareReferral() {
    if (!referral) return
    const text = `Join me on Style Yangu — your personal AI stylist! ${referral.shareUrl}`
    if (navigator.share) {
      await navigator.share({ title: 'Join Style Yangu', text }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(text).catch(() => undefined)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-5 pb-8">
      {/* Avatar + stylist */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-[#E8DDD5] p-4">
        <div className="w-16 h-16 rounded-full bg-[#F5EDE5] border-2 border-[#E8DDD5] flex items-center justify-center text-2xl">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
          ) : '👤'}
        </div>
        <div>
          <p className="font-bold text-[#1A0A00]">My Style</p>
          <p className="text-sm text-[#1A0A00]/60">Styled by {stylistDisplay}</p>
          <span className="text-xs bg-[#F5EDE5] text-[#8B4513] px-2 py-0.5 rounded-full mt-1 inline-block">
            {profile?.tier === 'premium' ? 'Premium' : 'Free'}
          </span>
        </div>
      </div>

      {/* Gamification */}
      {streak && (
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <p className="font-bold text-[#1A0A00] mb-3">Style Stats</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">🔥 {streak.streakDays}</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Day streak</p>
            </div>
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">{streak.stylePoints}</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Style points</p>
            </div>
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">{streak.weeklyScore}/10</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Weekly score</p>
            </div>
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">#{streak.leaderboardRank}</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Leaderboard</p>
            </div>
          </div>
        </div>
      )}

      {/* Referral */}
      {referral && (
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <p className="font-bold text-[#1A0A00] mb-3">Invite Friends</p>
          <div className="bg-[#F5EDE5] rounded-xl p-3 flex items-center justify-between mb-3">
            <span className="font-mono font-bold text-[#8B4513] tracking-widest">{referral.code}</span>
            <button
              onClick={shareReferral}
              className="text-xs bg-[#8B4513] text-white px-3 py-1.5 rounded-lg"
            >
              Share
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Clicks', value: referral.counters.totalClicks },
              { label: 'Total Joined', value: referral.counters.totalJoined },
              { label: 'Awaiting Upgrade', value: referral.counters.awaitingUpgrade },
              { label: 'Upgraded This Month', value: referral.counters.upgradedThisMonth },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#F5EDE5] rounded-xl p-2.5 text-center">
                <p className="font-bold text-[#1A0A00]">{value}</p>
                <p className="text-xs text-[#1A0A00]/50 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification preferences */}
      <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
        <p className="font-bold text-[#1A0A00] mb-3">Notifications</p>
        <div className="flex flex-col gap-2">
          {NOTIF_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleNotifChange(value)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                notifFreq === value
                  ? 'border-[#8B4513] bg-[#F5EDE5] text-[#8B4513]'
                  : 'border-[#E8DDD5] text-[#1A0A00]'
              }`}
            >
              <span className="text-sm">{label}</span>
              {notifFreq === value && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium"
      >
        Sign Out
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/ProfileTab.test.tsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd "apps/consumer" && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/consumer/src/pages/ProfileTab.tsx apps/consumer/src/__tests__/ProfileTab.test.tsx
git commit -m "feat(consumer): Profile tab — avatar, gamification, referral, notification prefs, sign out"
```

---

### Task 5: Final type-check and delete old Home.tsx placeholder

**Files:**
- Delete: `apps/consumer/src/pages/Home.tsx`

- [ ] **Step 1: Delete the old placeholder**

```bash
rm "apps/consumer/src/pages/Home.tsx"
```

- [ ] **Step 2: Full type-check**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite one final time**

```bash
cd "apps/consumer" && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(consumer): consumer home screen complete — all 5 tabs implemented"
```
