import { describe, expect, it, vi } from 'vitest'

vi.mock('./normalizeDigits', async importOriginal => {
  const actual = (await importOriginal()) as { normalizeDigits: (text: string) => string }

  return { ...actual, normalizeDigits: vi.fn(actual.normalizeDigits) }
})

const { normalizeDigits } = await import('./normalizeDigits')
const { parseNumeric, parseNumericStrict } = await import('./parseNumeric')

describe('parseNumeric shortcut', () => {
  it('reads plain ASCII numbers without running the normalization chain', () => {
    const calls = vi.mocked(normalizeDigits)

    calls.mockClear()
    expect(parseNumeric('12500')).toBe(12500)
    expect(parseNumeric('-42.5')).toBe(-42.5)
    expect(parseNumeric('+7')).toBe(7)
    expect(parseNumeric('5.')).toBe(5)
    expect(parseNumericStrict('0012')).toBe(12)
    expect(calls).not.toHaveBeenCalled()
  })

  it('still normalizes everything that is not plain ASCII', () => {
    const calls = vi.mocked(normalizeDigits)

    calls.mockClear()
    expect(parseNumeric('۱۲٬۵۰۰')).toBe(12500)
    expect(parseNumeric('1,500')).toBe(1500)
    expect(parseNumeric(' 12 ')).toBe(12)
    expect(parseNumeric('.5')).toBe(0.5)
    expect(calls).toHaveBeenCalledTimes(4)
  })
})
