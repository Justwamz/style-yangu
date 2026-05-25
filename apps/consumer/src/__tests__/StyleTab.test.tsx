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
