import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import POSTransactionCard from '../../components/POSTransactionCard'
import type { POSTransaction } from '@style-yangu/types'

const BASE_TX: POSTransaction = {
  id: 'tx1', sellerId: 's1', itemId: 'i1', itemName: 'Blue Dress',
  listedPriceKES: 3500, finalPriceKES: 3200, paymentMethod: 'mpesa',
  paymentStatus: 'paid', clientNickname: 'Aisha', clientUsername: '@aisha_ke',
  whatsappNumber: '+254700000001', createdAt: '2025-06-20T10:00:00Z',
}

describe('POSTransactionCard', () => {
  it('shows item name and final price', () => {
    render(<POSTransactionCard tx={BASE_TX} />)
    expect(screen.getByText('Blue Dress')).toBeInTheDocument()
    expect(screen.getByText(/3,200/)).toBeInTheDocument()
  })

  it('shows payment method', () => {
    render(<POSTransactionCard tx={BASE_TX} />)
    expect(screen.getByText(/mpesa/i)).toBeInTheDocument()
  })

  it('shows green Paid badge for paid status', () => {
    render(<POSTransactionCard tx={BASE_TX} />)
    const badge = screen.getByText('Paid')
    expect(badge).toHaveClass('text-green-700')
  })

  it('shows red Owing badge for owing status', () => {
    render(<POSTransactionCard tx={{ ...BASE_TX, paymentStatus: 'owing' }} />)
    const badge = screen.getByText('Owing')
    expect(badge).toHaveClass('text-red-700')
  })

  it('shows orange Partially Paid badge', () => {
    render(<POSTransactionCard tx={{ ...BASE_TX, paymentStatus: 'partially_paid' }} />)
    const badge = screen.getByText('Partially Paid')
    expect(badge).toHaveClass('text-orange-700')
  })
})
