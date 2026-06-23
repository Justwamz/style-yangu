import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import InventoryCard from '../../components/InventoryCard'
import type { InventoryItem } from '@style-yangu/types'

const BASE_ITEM: InventoryItem = {
  id: 'i1', sellerId: 's1', name: 'Ankara Dress', category: 'dress',
  priceKES: 4500, occasionTags: ['wedding'], sizes: [{ size: 'M', quantity: 3 }],
  showcaseImageUrl: 'https://placehold.co/300x400', isLive: true, isSoldOut: false,
  discountPercent: null, discountExpiresAt: null, createdAt: '2025-01-01T00:00:00Z',
}

describe('InventoryCard', () => {
  it('shows item name and price', () => {
    render(<InventoryCard item={BASE_ITEM} />)
    expect(screen.getByText('Ankara Dress')).toBeInTheDocument()
    expect(screen.getByText(/4,500/)).toBeInTheDocument()
  })

  it('shows Live badge for live item with stock', () => {
    render(<InventoryCard item={BASE_ITEM} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows Sold Out badge', () => {
    render(<InventoryCard item={{ ...BASE_ITEM, isSoldOut: true }} />)
    expect(screen.getByText('Sold Out')).toBeInTheDocument()
  })

  it('shows Low Stock when all sizes have qty 1', () => {
    render(<InventoryCard item={{ ...BASE_ITEM, sizes: [{ size: 'M', quantity: 1 }] }} />)
    expect(screen.getByText('Low Stock')).toBeInTheDocument()
  })

  it('renders placeholder when no showcaseImageUrl', () => {
    render(<InventoryCard item={{ ...BASE_ITEM, showcaseImageUrl: null }} />)
    expect(screen.getByTestId('img-placeholder')).toBeInTheDocument()
  })
})
