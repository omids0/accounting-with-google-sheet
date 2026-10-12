import { describe, expect, it } from 'vitest'

import { compareVersions, decideWhatsNew, selectWhatsNewItems } from './whatsNew'

const log = [
  { version: '2.3.0', items: ['c1', 'c2'] },
  { version: '2.1.0', items: ['a1', 'a2', 'a3'] },
  { version: '2.2.0', items: ['b1', 'b2'] }
]

describe('compareVersions', () => {
  it('compares numerically, part by part', () => {
    expect(compareVersions('2.10.0', '2.9.9')).toBeGreaterThan(0)
    expect(compareVersions('2.1.0', '2.1.0')).toBe(0)
    expect(compareVersions('1.9', '2.0.0')).toBeLessThan(0)
    expect(compareVersions('2.1', '2.1.0')).toBe(0)
  })
})

describe('selectWhatsNewItems', () => {
  it('lists only versions after the last seen one, up to the current one', () => {
    expect(selectWhatsNewItems(log, '2.1.0', '2.2.0')).toEqual(['b1', 'b2'])
  })

  it('puts the newest version first and caps the lines at three', () => {
    expect(selectWhatsNewItems(log, '2.0.0', '2.3.0')).toEqual(['c1', 'c2', 'b1'])
  })

  it('ignores entries newer than the running version', () => {
    expect(selectWhatsNewItems(log, '2.1.0', '2.1.5')).toEqual([])
  })
})

describe('decideWhatsNew', () => {
  const today = '2026-10-12'

  it('records a first install without showing anything', () => {
    expect(decideWhatsNew(null, '2.2.0', today)).toEqual({
      show: false,
      next: { version: '2.2.0', firstDay: today }
    })
  })

  it('shows once after an update', () => {
    const stored = { version: '2.1.0', firstDay: '2026-09-01' }

    expect(decideWhatsNew(stored, '2.2.0', today)).toEqual({
      show: true,
      next: { version: '2.2.0', firstDay: '2026-09-01' }
    })
  })

  it('stays quiet on the first day but still marks the version seen', () => {
    const stored = { version: '2.1.0', firstDay: today }

    expect(decideWhatsNew(stored, '2.2.0', today)).toEqual({
      show: false,
      next: { version: '2.2.0', firstDay: today }
    })
  })

  it('does nothing when the version did not move forward', () => {
    const stored = { version: '2.2.0', firstDay: '2026-09-01' }

    expect(decideWhatsNew(stored, '2.2.0', today)).toEqual({ show: false, next: null })
    expect(decideWhatsNew(stored, '2.1.0', today)).toEqual({ show: false, next: null })
  })
})
