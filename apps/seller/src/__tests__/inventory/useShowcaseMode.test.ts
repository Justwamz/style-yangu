import { getShowcaseMode } from '../../hooks/useShowcaseMode'
import { describe, it, expect } from 'vitest'

describe('getShowcaseMode', () => {
  it.each([
    ['top', 'full_body'],
    ['bottom', 'full_body'],
    ['dress', 'full_body'],
    ['suit', 'full_body'],
    ['outerwear', 'full_body'],
    ['hat', 'face_neck'],
    ['shoe', 'studio'],
    ['bag', 'studio'],
    ['jewellery', 'studio'],
    ['accessory', 'studio'],
  ] as const)('%s → %s', (category, expected) => {
    expect(getShowcaseMode(category)).toBe(expected)
  })
})
