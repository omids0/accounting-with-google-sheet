import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  link: {} as Record<string, unknown>,
  showError: vi.fn(),
  showInfo: vi.fn(),
  saveLinked: vi.fn()
}))

vi.mock('../../hooks/useLinkTarget', () => ({ useLinkTarget: () => mocks.link }))
vi.mock('../../utils/toast', () => ({ showError: mocks.showError, showInfo: mocks.showInfo }))

const { useBankSmsLinkCard } = await import('./useBankSmsLinkCard')

type Card = ReturnType<typeof useBankSmsLinkCard>

let card: Card

function Probe() {
  card = useBankSmsLinkCard({
    entry: { amount: 5_000_000 } as never,
    choice: { category: 'بدهی', subCategory: '' } as never,
    type: 'expense',
    skip: false,
    review: { building: false, saveLinked: mocks.saveLinked } as never
  })

  return null
}

async function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const root: Root = createRoot(document.createElement('div'))

  await act(async () => root.render(createElement(Probe)))
}

const setLink = (patch: Record<string, unknown>) => {
  mocks.link = {
    kind: { fieldLabel: 'پرداخت کدام بدهی؟' },
    options: [{ id: 'd1' }],
    selectedId: '',
    loading: false,
    error: '',
    attach: vi.fn(),
    ...patch
  }
}

describe('a swipe-right (quick save) on a card whose category is a link target', () => {
  beforeEach(() => {
    mocks.showError.mockReset()
    mocks.showInfo.mockReset()
    mocks.saveLinked.mockReset()
  })

  it('does not save while open items exist and nothing is picked: it asks', async () => {
    setLink({})
    await mount()
    card.quickSave()

    expect(mocks.saveLinked).not.toHaveBeenCalled()
    expect(mocks.showInfo).toHaveBeenCalledWith(expect.stringContaining('پرداخت کدام بدهی؟'))
  })

  it('saves with the link once an item is picked', async () => {
    setLink({ selectedId: 'd1' })
    await mount()
    card.quickSave()

    expect(mocks.saveLinked).toHaveBeenCalledTimes(1)
    expect(mocks.showInfo).not.toHaveBeenCalled()
  })

  it('saves a plain record when nothing is open (there is nothing to ask)', async () => {
    setLink({ options: [] })
    await mount()
    card.quickSave()

    expect(mocks.saveLinked).toHaveBeenCalledTimes(1)
  })

  it('a pick that no longer fits shows its error and saves nothing', async () => {
    setLink({ selectedId: 'd1', error: 'مبلغ بیشتر از مانده است.' })
    await mount()
    card.quickSave()

    expect(mocks.saveLinked).not.toHaveBeenCalled()
    expect(mocks.showError).toHaveBeenCalledWith('مبلغ بیشتر از مانده است.')
  })

  it('the main button (save) stays an explicit choice: «هیچ‌کدوم» saves a plain record', async () => {
    setLink({})
    await mount()
    card.save()

    expect(mocks.saveLinked).toHaveBeenCalledTimes(1)
  })
})
