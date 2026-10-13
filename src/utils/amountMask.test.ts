import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AMOUNT_MASK_LABEL,
  AMOUNT_REVEAL_MS,
  createRevealTimer,
  maskDots,
  maskedText,
  maskWidthClass,
  type AmountMaskSize
} from './amountMask'

describe('mask width classes', () => {
  it('maps every size to a min-width class', () => {
    const sizes: AmountMaskSize[] = ['hero', 'stat', 'stat-wide', 'record', 'text', 'compact']

    for (const size of sizes) expect(maskWidthClass(size)).toMatch(/^min-w-\[\d+ch\]$/)
  })

  it('keeps the hero mask the widest and chart labels the narrowest', () => {
    expect(maskWidthClass('hero')).toBe('min-w-[9ch]')
    expect(maskWidthClass('stat')).toBe('min-w-[6ch]')
    expect(maskWidthClass('stat-wide')).toBe('min-w-[7ch]')
    expect(maskWidthClass('record')).toBe('min-w-[6ch]')
    expect(maskWidthClass('compact')).toBe('min-w-[3ch]')
  })

  it('defaults to the inline text size', () => {
    expect(maskWidthClass()).toBe(maskWidthClass('text'))
    expect(maskDots()).toBe('•••••')
  })

  it('uses more dots for the hero amount', () => {
    expect(maskDots('hero')).toBe('••••••••')
    expect(maskDots('compact')).toBe('•••')
  })
})

describe('maskedText', () => {
  it('replaces the amount with the accessible label only while hidden', () => {
    expect(maskedText(true, '۱۲۰٬۰۰۰ تومان')).toBe(AMOUNT_MASK_LABEL)
    expect(maskedText(false, '۱۲۰٬۰۰۰ تومان')).toBe('۱۲۰٬۰۰۰ تومان')
  })
})

describe('createRevealTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the amount for five seconds, then hides it again', () => {
    const onChange = vi.fn()
    const timer = createRevealTimer(onChange)

    timer.reveal()
    expect(onChange).toHaveBeenLastCalledWith(true)

    vi.advanceTimersByTime(AMOUNT_REVEAL_MS - 1)
    expect(onChange).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(AMOUNT_REVEAL_MS).toBe(5000)
  })

  it('restarts the window on a second tap', () => {
    const onChange = vi.fn()
    const timer = createRevealTimer(onChange)

    timer.reveal()
    vi.advanceTimersByTime(3000)
    timer.reveal()
    vi.advanceTimersByTime(3000)
    expect(onChange).not.toHaveBeenCalledWith(false)

    vi.advanceTimersByTime(2000)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('does nothing after dispose (unmounted amount)', () => {
    const onChange = vi.fn()
    const timer = createRevealTimer(onChange)

    timer.reveal()
    timer.dispose()
    vi.advanceTimersByTime(AMOUNT_REVEAL_MS * 2)

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
