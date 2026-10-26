import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinkTargetState } from './useLinkTarget'

const mocks = vi.hoisted(() => ({ items: [] as unknown[], resolve: null as null | (() => void) }))

vi.mock('../services/workspace', () => ({ isPersonalWorkspace: () => true }))
vi.mock('../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: 'sid-loading' }),
  isConfigured: () => true
}))
vi.mock('../services/linkPayment', () => ({
  listOpenLinkTargets: () =>
    new Promise(resolve => {
      mocks.resolve = () => resolve(mocks.items)
    }),
  attachRecordToTarget: vi.fn(),
  linkFailureMessage: () => ''
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

const { useLinkTarget } = await import('./useLinkTarget')

const frames: LinkTargetState[] = []

function Probe({ category }: { category: string }) {
  const state = useLinkTarget({ type: 'expense', category, amount: 5 })

  frames.push(state)

  return null
}

async function mount(category: string) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const root = createRoot(document.createElement('div'))

  await act(async () => root.render(createElement(Probe, { category })))

  return root
}

const settle = () => act(async () => mocks.resolve?.())

describe('the link picker is «loading» from its very first frame (no empty-state flash)', () => {
  beforeEach(() => {
    frames.length = 0
    mocks.resolve = null
  })

  it('a category that links: loading in every frame until the list is read', async () => {
    mocks.items = [{ id: 'd1', title: 'وام', remaining: 10, category: '' }]
    await mount('بدهی')

    expect(frames.length).toBeGreaterThan(0)
    expect(frames.every(frame => frame.loading)).toBe(true)
    await settle()
    expect(frames.at(-1)?.loading).toBe(false)
    expect(frames.at(-1)?.options).toHaveLength(1)
  })

  it('a category that does not link is never loading', async () => {
    await mount('خوراک')
    expect(frames.every(frame => !frame.loading && frame.kind === null)).toBe(true)
  })

  it('after a read that found nothing open, the next card of that kind expects it while loading', async () => {
    mocks.items = []
    await mount('طلب')
    await settle()
    expect(frames.at(-1)?.expectEmpty).toBe(false)
    frames.length = 0
    await mount('بدهی')
    expect(frames.at(-1)?.expectEmpty).toBe(false)
    await settle()
    // The expense «بدهی» kind was found empty just now; a new card of it starts expecting that.
    frames.length = 0
    await mount('بدهی')
    expect(frames[0].expectEmpty).toBe(true)
    expect(frames[0].loading).toBe(true)
  })
})
