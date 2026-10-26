import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinkTargetState } from './useLinkTarget'

const mocks = vi.hoisted(() => ({
  personal: true,
  items: [] as {
    id: string
    title: string
    remaining: number
    category: string
    detail?: string
    children?: { id: string; title: string; amount: number }[]
  }[],
  list: vi.fn(),
  attach: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn()
}))

vi.mock('../services/workspace', () => ({ isPersonalWorkspace: () => mocks.personal }))
vi.mock('../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: 'sid' }),
  isConfigured: () => true
}))
vi.mock('../services/linkPayment', () => ({
  listOpenLinkTargets: mocks.list,
  attachRecordToTarget: mocks.attach,
  linkFailureMessage: () => 'رکورد ذخیره شد ولی پرداخت بدهی ثبت نشد.'
}))
vi.mock('../utils/toast', () => ({ showError: mocks.showError, showSuccess: mocks.showSuccess }))

const { useLinkTarget } = await import('./useLinkTarget')

type Props = Parameters<typeof useLinkTarget>[0]

let root: Root | null = null
let container: HTMLElement | null = null
let current: LinkTargetState

function Probe(props: Props) {
  current = useLinkTarget(props)

  return null
}

async function mount(props: Props) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  root = createRoot(container)
  await act(async () => root!.render(createElement(Probe, props)))

  return async (next: Props) => act(async () => root!.render(createElement(Probe, next)))
}

async function attachInAct(record: { recordId: string; amount: number; date: string }) {
  let done = false

  await act(async () => {
    done = await current.attach(record)
  })

  return done
}

const debts = [
  { id: 'd1', title: 'قسط وام', remaining: 20_000_000, category: 'بانک' },
  { id: 'd2', title: 'خرید لامپ', remaining: 1_000_000, category: 'خانه' },
  { id: 'd3', title: 'قرض علی', remaining: 5_000_000, category: 'دوستان' }
]

const expenseProps: Props = { type: 'expense', category: 'بدهی', amount: '5000000' }

describe('useLinkTarget', () => {
  beforeEach(() => {
    mocks.personal = true
    mocks.items = debts
    mocks.list.mockReset().mockImplementation(async () => mocks.items)
    mocks.attach.mockReset().mockResolvedValue('قسط وام')
    mocks.showError.mockReset()
    mocks.showSuccess.mockReset()
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    root = null
  })

  it('stays off, and reads nothing, for any other category', async () => {
    await mount({ type: 'expense', category: 'خوراک', amount: '100' })
    expect(current.kind).toBeNull()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('stays off in a building or a shared account', async () => {
    mocks.personal = false
    await mount(expenseProps)
    expect(current.kind).toBeNull()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('stays off when the surface turns it off (a unit offer or a probable duplicate)', async () => {
    await mount({ ...expenseProps, enabled: false })
    expect(current.kind).toBeNull()
  })

  it('lists the open debts with nothing picked, and disables one smaller than the amount', async () => {
    await mount(expenseProps)
    expect(current.kind?.id).toBe('dang')
    expect(current.selectedId).toBe('')
    expect(current.options.map(option => [option.id, option.disabled])).toEqual([
      ['d1', false],
      ['d2', true], // 1M left, a 5M record
      ['d3', false] // exactly 5M left still fits
    ])
  })

  it('enables everything while the amount is blank', async () => {
    await mount({ ...expenseProps, amount: '' })
    expect(current.options.every(option => !option.disabled)).toBe(true)
  })

  it('lists first the debts filed under the chosen subcategory', async () => {
    await mount({ ...expenseProps, subCategory: 'دوستان' })
    expect(current.options.map(option => option.id)).toEqual(['d3', 'd1', 'd2'])
  })

  it('reads receivables for an income «طلب»', async () => {
    await mount({ type: 'income', category: 'طلب', amount: '10' })
    expect(current.kind?.id).toBe('receivable')
    expect(mocks.list).toHaveBeenCalledWith('receivable', 'sid')
  })

  it('treats a list that cannot be read as nothing to link', async () => {
    mocks.list.mockRejectedValue(new Error('offline'))
    await mount(expenseProps)
    expect(current.options).toEqual([])
    expect(current.loading).toBe(false)
  })

  it('blocks saving when the amount is raised past the picked debt', async () => {
    const rerender = await mount(expenseProps)

    await act(async () => current.select('d3'))
    expect(current.error).toBe('')
    await rerender({ ...expenseProps, amount: '6000000' })
    expect(current.error).toContain('نمی‌تواند بیشتر از مانده')
  })

  it('forgets the pick when the category leaves «بدهی»', async () => {
    const rerender = await mount(expenseProps)

    await act(async () => current.select('d1'))
    await rerender({ ...expenseProps, category: 'خوراک' })
    await rerender(expenseProps)
    expect(current.selectedId).toBe('')
  })

  it('does nothing without a pick: no payment, no message', async () => {
    await mount(expenseProps)

    const done = await attachInAct({ recordId: 'r1', amount: 5_000_000, date: '1405-01-01' })

    expect(done).toBe(false)
    expect(mocks.attach).not.toHaveBeenCalled()
  })

  it('adds the saved record as the payment of the picked debt', async () => {
    await mount(expenseProps)
    await act(async () => current.select('d1'))

    const done = await attachInAct({ recordId: 'r1', amount: 5_000_000, date: '1405-01-01' })

    expect(done).toBe(true)
    expect(mocks.attach).toHaveBeenCalledWith(
      'dang',
      'sid',
      'd1',
      { recordId: 'r1', amount: 5_000_000, date: '1405-01-01' },
      ''
    )
    expect(mocks.showSuccess).toHaveBeenCalledWith(expect.stringContaining('قسط وام'))
  })

  it('keeps the record when the payment fails: tells where to link it, never throws', async () => {
    mocks.attach.mockRejectedValue(new Error('500'))
    await mount(expenseProps)
    await act(async () => current.select('d1'))

    const done = await attachInAct({ recordId: 'r1', amount: 5_000_000, date: '1405-01-01' })

    expect(done).toBe(false)
    expect(mocks.showError).toHaveBeenCalledTimes(1)
    expect(mocks.showError.mock.calls[0][0]).not.toContain('دوباره ذخیره')
    expect(mocks.showSuccess).not.toHaveBeenCalled()
  })

  it('reads the list again after a save, so the new remaining shows', async () => {
    await mount(expenseProps)
    expect(mocks.list).toHaveBeenCalledTimes(1)
    await act(async () => current.reset())
    expect(mocks.list).toHaveBeenCalledTimes(2)
    expect(current.selectedId).toBe('')
  })
})
