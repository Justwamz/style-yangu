import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useGenerateShowcase } from '../../hooks/useGenerateShowcase'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

function wrap() {
  const qc = new QueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useGenerateShowcase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.restoreAllMocks()
  })

  afterEach(() => vi.useRealTimers())

  it('returns generating=true during stub delay then resolves URL', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({})
    const { result } = renderHook(() => useGenerateShowcase(), { wrapper: wrap() })
    let resultUrl = ''

    act(() => {
      result.current
        .generate({ itemId: 'i1', itemName: 'Blue Dress', mode: 'full_body', faceId: 'f1' })
        .then(url => { resultUrl = url })
    })

    expect(result.current.generating).toBe(true)
    // Flush the sellerApi.post microtask first, then advance the stub delay timer
    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(2500) })
    expect(result.current.generating).toBe(false)
    expect(resultUrl).toContain('placehold.co')
    expect(resultUrl).toContain('Blue')
  })
})
