import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinkTargetState } from './useLinkTarget'

const mocks = vi.hoisted(() => ({
  open: [] as unknown[],
  list: vi.fn(),
  attach: vi.fn(async () => 'قسط وام')
}))

vi.mock('../services/workspace', () => ({ isPersonalWorkspace: () => true }))
vi.mock('../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: 'sid-shared' }),
  isConfigured: () => true
}))
vi.mock('../services/linkPayment', () => ({
  listOpenLinkTargets: async () => {
    mocks.list()

    return mocks.open
  },
  attachRecordToTarget: mocks.attach,
  linkFailureMessage: () => ''
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

const { useLinkTarget } = await import('./useLinkTarget')

const cards: Record<string, LinkTargetState> = {}

function Card({ id }: { id: string }) {
  cards[id] = useLinkTarget({ type: 'expense', category: 'بدهی', amount: 5 })

  return null
}

/** Lets the dynamic import and the list read finish. */
const flush = async () => {
  for (let i = 0; i < 200; i += 1) {
    await act(async () => new Promise(resolve => setTimeout(resolve, 10)))
    const all = Object.values(cards)

    if (all.length && all.every(card => !card.loading)) return
  }
}
const debt = { id: 'd1', title: 'قسط وام', remaining: 20_000_000, category: '' }

describe('a link written on one card refreshes the picker of every other card', () => {
  beforeEach(() => {
    mocks.list.mockClear()
    mocks.open = [debt]
  })

  it('card 2 stops offering the debt card 1 just completed', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    for (const id of ['one', 'two']) {
      const root = createRoot(document.createElement('div'))

      await act(async () => root.render(createElement(Card, { id })))
      // One card at a time: the first dynamic import of the (mocked) service must settle first.
      await flush()
    }
    expect(cards.two.options).toHaveLength(1)

    // Card 1 pays the debt in full; the sheet no longer lists it.
    mocks.open = []
    await act(async () => {
      cards.one.select('d1')
    })
    await act(async () => {
      await cards.one.attach({ recordId: 'r1', amount: 20_000_000, date: '1405-02-03' })
    })

    await flush()
    expect(cards.two.options).toHaveLength(0)
    expect(cards.two.loading).toBe(false)
  })
})
