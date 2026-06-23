import { createApiClient } from '@style-yangu/api-client'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('createApiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('reads the specified token key from localStorage', async () => {
    localStorage.setItem('sy_seller_token', 'seller-jwt-abc')
    const sellerClient = createApiClient('sy_seller_token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    await sellerClient.get('/seller/profile')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/seller/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer seller-jwt-abc' }),
      })
    )
  })

  it('does not send Authorization header when token absent', async () => {
    const sellerClient = createApiClient('sy_seller_token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    await sellerClient.get('/seller/profile')
    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers?.Authorization).toBeUndefined()
  })
})
