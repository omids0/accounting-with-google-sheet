import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rememberWorkspaceCards } from './bankSmsRouting'
import { loadMissingBuildingCards } from './bankSmsRoutingSync'
import { getDefaultSettings, saveSettings } from './settings'

const loadBuildingSummary = vi.hoisted(() => vi.fn(async () => null))

vi.mock('./buildingSummary', () => ({ loadBuildingSummary }))

/** Every test uses buildings of its own: a failed read is remembered for a few minutes. */
function register(...ids: string[]): void {
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 'personal-1',
    spreadsheets: [
      { id: 'personal-1', name: 'a', createdAt: '' },
      ...ids.map(id => ({ id, name: id, createdAt: '', kind: 'building' as const }))
    ]
  })
}

beforeEach(() => {
  localStorage.clear()
  loadBuildingSummary.mockClear()
})

describe('loadMissingBuildingCards', () => {
  it('reads only the buildings whose cards are not cached yet', async () => {
    register('only-new', 'only-known')
    rememberWorkspaceCards('only-known', [
      { title: 'x', cardNumber: '6104337812343210', accountNumber: '', iban: '' }
    ])

    await loadMissingBuildingCards()

    expect(loadBuildingSummary).toHaveBeenCalledTimes(1)
    expect(loadBuildingSummary).toHaveBeenCalledWith('only-new')
  })

  it('does not read a building again right after a failed read', async () => {
    register('flaky')

    await loadMissingBuildingCards()
    await loadMissingBuildingCards()

    expect(loadBuildingSummary).toHaveBeenCalledTimes(1)
  })

  it('does nothing when every building is known', async () => {
    register('all-known')
    rememberWorkspaceCards('all-known', [])
    await loadMissingBuildingCards()

    expect(loadBuildingSummary).not.toHaveBeenCalled()
  })
})
