import { beforeEach, describe, expect, it } from 'vitest'

import { leaveChildOnColdStart } from './coldStartWorkspace'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { PERSONAL_SHEET_KEY } from './workspace'

type Kind = 'personal' | 'building' | 'shared' | 'child'

const entry = (id: string, kind?: Kind) => ({
  id,
  name: `حسابداری ${id}`,
  createdAt: '',
  ...(kind ? { kind } : {})
})

function start(activeId: string, entries: ReturnType<typeof entry>[]): void {
  saveSettings({ ...getDefaultSettings(), spreadsheetId: activeId, spreadsheets: entries })
}

const activeId = () => getSettings()?.spreadsheetId

beforeEach(() => localStorage.clear())

describe('leaveChildOnColdStart', () => {
  it('opens the own personal sheet when the app was left inside a child account', () => {
    start('kid', [entry('kid', 'child'), entry('mine')])

    expect(leaveChildOnColdStart()).toBe('mine')
    expect(activeId()).toBe('mine')
  })

  it('keeps every child in the registry so «فرزندان من» can re-enter one', () => {
    start('kid', [entry('kid', 'child'), entry('kid2', 'child'), entry('mine')])
    leaveChildOnColdStart()

    const kinds = Object.fromEntries((getSettings()?.spreadsheets ?? []).map(s => [s.id, s.kind]))

    expect(kinds.kid).toBe('child')
    expect(kinds.kid2).toBe('child')
  })

  it('prefers the personal sheet remembered when the parent last left it', () => {
    start('kid', [entry('kid', 'child'), entry('mine'), entry('second')])
    localStorage.setItem(PERSONAL_SHEET_KEY, JSON.stringify('second'))

    expect(leaveChildOnColdStart()).toBe('second')
  })

  it('never picks a building, the shared account or another child as the personal sheet', () => {
    start('kid', [
      entry('b', 'building'),
      entry('s', 'shared'),
      entry('kid2', 'child'),
      entry('kid', 'child'),
      entry('mine')
    ])

    expect(leaveChildOnColdStart()).toBe('mine')
  })

  it('changes nothing without a personal sheet to go to', () => {
    start('kid', [entry('kid', 'child'), entry('b', 'building')])

    expect(leaveChildOnColdStart()).toBeNull()
    expect(activeId()).toBe('kid')
  })

  it('leaves a personal, building or shared start alone', () => {
    for (const active of ['mine', 'b', 's']) {
      start(active, [
        entry('mine'),
        entry('b', 'building'),
        entry('s', 'shared'),
        entry('k', 'child')
      ])
      expect(leaveChildOnColdStart()).toBeNull()
      expect(activeId()).toBe(active)
    }
  })

  it('does nothing before the first sheet is chosen', () => {
    expect(leaveChildOnColdStart()).toBeNull()
    expect(getSettings()).toBeNull()
  })
})
