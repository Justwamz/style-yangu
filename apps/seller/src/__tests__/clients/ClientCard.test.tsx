import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ClientCard from '../../components/ClientCard'
import type { SellerClient } from '@style-yangu/types'

const CLIENT: SellerClient = {
  id: 'c1', sellerId: 's1', nickname: 'Aisha',
  consumerUsername: '@aisha_ke', lastPurchaseDate: '2025-06-10T00:00:00Z',
  whatsappNumber: null, tryOnSent: 3, tryOnActed: 1,
}

describe('ClientCard', () => {
  it('shows nickname and username', () => {
    render(<ClientCard client={CLIENT} />)
    expect(screen.getByText('Aisha')).toBeInTheDocument()
    expect(screen.getByText('@aisha_ke')).toBeInTheDocument()
  })

  it('shows try-on stats', () => {
    render(<ClientCard client={CLIENT} />)
    expect(screen.getByText(/3 sent/i)).toBeInTheDocument()
    expect(screen.getByText(/1 acted/i)).toBeInTheDocument()
  })

  it('shows — when no last purchase date', () => {
    render(<ClientCard client={{ ...CLIENT, lastPurchaseDate: null }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
