import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import FaceLibraryPicker from '../../components/FaceLibraryPicker'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const FACES = [
  { id: 'f1', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'editorial', skinDepth: 'medium' },
  { id: 'f2', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'everyday', skinDepth: 'deep' },
  { id: 'f3', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'traditional', skinDepth: 'medium' },
  { id: 'f4', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'streetwear', skinDepth: 'light' },
  { id: 'm1', gender: 'male', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'streetwear', skinDepth: 'light' },
  { id: 'm2', gender: 'male', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'corporate', skinDepth: 'medium_deep' },
]

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('FaceLibraryPicker', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('locks faces beyond first 2 female and first 2 male for free_trial', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(FACES)
    wrap(<FaceLibraryPicker selectedId={null} onSelect={vi.fn()} tier="free_trial" />)
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(6))
    expect(screen.getAllByText(/upgrade/i)).toHaveLength(2)
  })

  it('renders all 6 cards for hustler (no locked overlay)', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(FACES)
    wrap(<FaceLibraryPicker selectedId={null} onSelect={vi.fn()} tier="hustler" />)
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(6))
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument()
  })

  it('calls onSelect when an unlocked card is clicked', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(FACES)
    const onSelect = vi.fn()
    wrap(<FaceLibraryPicker selectedId={null} onSelect={onSelect} tier="free_trial" />)
    await waitFor(() => screen.getAllByRole('img'))
    await userEvent.click(screen.getAllByRole('img')[0])
    expect(onSelect).toHaveBeenCalledWith('f1')
  })
})
