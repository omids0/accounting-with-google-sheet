import { describe, expect, it } from 'vitest'

import {
  canShowNudge,
  nudgeShownOn,
  withNudgeNever,
  withNudgeShown,
  type NudgeState
} from './nudgeGate'

const ctx = { today: '2026-10-12', period: '1405-07', targetHasData: false }
const used: NudgeState = { firstDay: '2026-10-01', signals: {} }

describe('nudge gate', () => {
  it('shows a fresh signal to a returning user', () => {
    expect(canShowNudge(used, 'a', ctx)).toBe(true)
  })

  it('never shows while the target already has data', () => {
    expect(canShowNudge(used, 'a', { ...ctx, targetHasData: true })).toBe(false)
  })

  it('never shows on the first day or before it is known', () => {
    expect(canShowNudge({ ...used, firstDay: ctx.today }, 'a', ctx)).toBe(false)
    expect(canShowNudge({ signals: {} }, 'a', ctx)).toBe(false)
  })

  it('shows each signal once per period', () => {
    const shown = withNudgeShown(used, 'a', '2026-10-05', ctx.period)

    expect(canShowNudge(shown, 'a', ctx)).toBe(false)
    expect(canShowNudge(shown, 'a', { ...ctx, today: '2026-10-23', period: '1405-08' })).toBe(true)
  })

  it('caps all signals at one a day', () => {
    const shown = withNudgeShown(used, 'a', ctx.today, '1405-06')

    expect(nudgeShownOn(shown, ctx.today)).toBe(true)
    expect(canShowNudge(shown, 'b', ctx)).toBe(false)
    expect(canShowNudge(shown, 'b', { ...ctx, today: '2026-10-13' })).toBe(true)
  })

  it('«دیگر نپرس» is permanent for that signal only', () => {
    const never = withNudgeNever(used, 'a')

    expect(canShowNudge(never, 'a', { ...ctx, period: '1406-01' })).toBe(false)
    expect(canShowNudge(never, 'b', ctx)).toBe(true)
  })
})
