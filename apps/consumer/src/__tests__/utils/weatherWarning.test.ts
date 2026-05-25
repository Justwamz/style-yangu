import { describe, it, expect } from 'vitest'
import { getWeatherWarning } from '../../utils/weatherWarning'

describe('getWeatherWarning', () => {
  it('returns null when no clothing tags match the condition', () => {
    expect(getWeatherWarning('Clear', ['shirt', 'chinos'], 'amara')).toBeNull()
  })

  it('warns about loose skirts in windy conditions — amara voice', () => {
    const result = getWeatherWarning('Windy', ['loose-skirt', 'heels'], 'amara')
    expect(result).not.toBeNull()
    expect(result!.level).toBe(1)
    expect(result!.message).toMatch(/wind/i)
  })

  it('warns about loose skirts in windy conditions — kofi voice', () => {
    const result = getWeatherWarning('Windy', ['loose-skirt'], 'kofi')
    expect(result).not.toBeNull()
    expect(result!.message).toMatch(/agenda/i)
  })

  it('warns about suede shoes in rainy conditions', () => {
    const result = getWeatherWarning('Rain', ['suede', 'trousers'], 'amara')
    expect(result).not.toBeNull()
    expect(result!.level).toBe(2)
  })

  it('warns about heavy layers in extreme heat', () => {
    const result = getWeatherWarning('Extreme', ['heavy-layer', 'shirt'], 'kofi')
    expect(result).not.toBeNull()
  })

  it('warns about bare legs in cold conditions', () => {
    const result = getWeatherWarning('Cold', ['bare-legs'], 'amara')
    expect(result).not.toBeNull()
  })

  it('returns null when condition matches but no clothing tag triggers', () => {
    expect(getWeatherWarning('Rain', ['shirt', 'chinos'], 'amara')).toBeNull()
  })

  it('is case-insensitive on condition', () => {
    const result = getWeatherWarning('WINDY', ['loose-skirt'], 'amara')
    expect(result).not.toBeNull()
  })
})
