import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useTierGate } from '../hooks/useTierGate'
import { useSellerContext } from '../context/SellerContext'

vi.mock('../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('useTierGate', () => {
  it('blocks clients_tab for free_trial', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { tier: 'free_trial' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('clients_tab'))
    expect(result.current.allowed).toBe(false)
    expect(result.current.reason).toMatch(/upgrade/i)
  })

  it('allows clients_tab for hustler', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { tier: 'hustler' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('clients_tab'))
    expect(result.current.allowed).toBe(true)
    expect(result.current.reason).toBe('')
  })

  it('blocks ad_boost for free_trial', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { tier: 'free_trial' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('ad_boost'))
    expect(result.current.allowed).toBe(false)
  })

  it('returns allowed when profile is null (loading state)', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: null,
      loading: true,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('clients_tab'))
    expect(result.current.allowed).toBe(true)
  })
})
