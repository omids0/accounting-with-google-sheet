import { beforeEach, describe, expect, it } from 'vitest'

import { claimNudge, neverAskNudge, trackNoAccountStreak, wasNudgeShownToday } from './nudges'

const ID = 'sheet-1'
const day = (iso: string) => new Date(`${iso}T10:00:00`)

describe('nudge storage', () => {
  beforeEach(() => localStorage.clear())

  it('starts the first day silently, then shows once a day and once a month', () => {
    expect(claimNudge(ID, 'a', false, day('2026-10-01'))).toBe(false)
    expect(claimNudge(ID, 'a', false, day('2026-10-02'))).toBe(true)
    expect(wasNudgeShownToday(ID, day('2026-10-02'))).toBe(true)
    expect(claimNudge(ID, 'b', false, day('2026-10-02'))).toBe(false)
    expect(claimNudge(ID, 'a', false, day('2026-10-03'))).toBe(false)
    expect(claimNudge(ID, 'b', false, day('2026-10-03'))).toBe(true)
  })

  it('keeps «دیگر نپرس» and skips targets that have data', () => {
    claimNudge(ID, 'a', false, day('2026-10-01'))
    neverAskNudge(ID, 'a')
    expect(claimNudge(ID, 'a', false, day('2026-12-01'))).toBe(false)
    expect(claimNudge(ID, 'b', true, day('2026-12-01'))).toBe(false)
  })

  it('counts records in a row without an account', () => {
    expect(trackNoAccountStreak(ID, false)).toBe(1)
    expect(trackNoAccountStreak(ID, false)).toBe(2)
    expect(trackNoAccountStreak(ID, true)).toBe(0)
  })
})
