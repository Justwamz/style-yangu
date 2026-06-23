import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TierBadge from '../../components/TierBadge'

describe('TierBadge', () => {
  it('renders Free Trial label', () => {
    render(<TierBadge tier="free_trial" />)
    expect(screen.getByText('Free Trial')).toBeInTheDocument()
  })

  it('renders Hustler label', () => {
    render(<TierBadge tier="hustler" />)
    expect(screen.getByText('Hustler')).toBeInTheDocument()
  })

  it('renders Boutique label', () => {
    render(<TierBadge tier="boutique" />)
    expect(screen.getByText('Boutique')).toBeInTheDocument()
  })

  it('renders Brand label', () => {
    render(<TierBadge tier="brand" />)
    expect(screen.getByText('Brand')).toBeInTheDocument()
  })
})
