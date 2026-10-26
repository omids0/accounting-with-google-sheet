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

describe('useLinkTarget: checks', () => {
  const checks = [
    { id: 'c1', title: 'چک ۱ · علی', remaining: 2_000_000, category: '' },
    { id: 'c2', title: 'چک ۲ · رضا', remaining: 5_000_000, category: '' },
    { id: 'c3', title: 'چک ۳ · سارا', remaining: 5_000_000, category: 'خانه' }
  ]

  beforeEach(() => {
    mocks.personal = true
    mocks.items = checks
    mocks.list.mockReset().mockImplementation(async () => mocks.items)
    mocks.attach.mockReset().mockResolvedValue('چک ۲')
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    root = null
  })

  it('reads paid checks for an expense «چک» and received ones for an income', async () => {
    await mount({ type: 'expense', category: 'چک', amount: '5000000' })
    expect(current.kind?.id).toBe('checkPaid')
    expect(mocks.list).toHaveBeenCalledWith('checkPaid', 'sid')
    await act(async () => root?.unmount())
    root = null
    await mount({ type: 'income', category: 'چک', amount: '5000000' })
    expect(current.kind?.id).toBe('checkReceived')
    expect(mocks.list).toHaveBeenCalledWith('checkReceived', 'sid')
  })

  it('lists the checks of the record amount first and disables the others', async () => {
    await mount({ type: 'expense', category: 'چک', amount: '5000000' })
    expect(current.options.map(option => [option.id, option.disabled])).toEqual([
      ['c2', false],
      ['c3', false],
      ['c1', true]
    ])
  })

  it('puts the subcategory first among the checks of the same amount', async () => {
    await mount({ type: 'expense', category: 'چک', subCategory: 'خانه', amount: '5000000' })
    expect(current.options.map(option => option.id)).toEqual(['c3', 'c2', 'c1'])
  })

  it('blocks saving when the amount no longer equals the picked check', async () => {
    const rerender = await mount({ type: 'expense', category: 'چک', amount: '5000000' })

    await act(async () => current.select('c2'))
    expect(current.error).toBe('')
    await rerender({ type: 'expense', category: 'چک', amount: '4000000' })
    expect(current.error).toContain('با مبلغ رکورد یکی نیست')
  })

  it('has no second level for a check', async () => {
    await mount({ type: 'expense', category: 'چک', amount: '5000000' })
    await act(async () => current.select('c2'))
    expect(current.childOptions).toEqual([])
    expect(current.childId).toBe('')
  })
})

describe('useLinkTarget: installments', () => {
  const books = [
    {
      id: 'b1',
      title: 'وام خودرو',
      remaining: 3_000_000,
      category: '',
      detail: '۳ قسط مانده',
      children: [
        { id: '4', title: 'قسط ۴ از ۶', amount: 1_000_000 },
        { id: '5', title: 'قسط ۵ از ۶', amount: 1_000_000 },
        { id: '6', title: 'قسط ۶ از ۶', amount: 1_000_000 }
      ]
    },
    {
      id: 'b2',
      title: 'وام مسکن',
      remaining: 800_000,
      category: '',
      children: [{ id: '2', title: 'قسط ۲ از ۲', amount: 800_000 }]
    }
  ]

  const props: Props = { type: 'expense', category: 'قسط', amount: '1000000' }

  beforeEach(() => {
    mocks.personal = true
    mocks.items = books
    mocks.list.mockReset().mockImplementation(async () => mocks.items)
    mocks.attach.mockReset().mockResolvedValue('قسط ۵ از «وام خودرو»')
    mocks.showError.mockReset()
    mocks.showSuccess.mockReset()
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    root = null
  })

  it('never disables a book, whatever the amount', async () => {
    await mount({ ...props, amount: '99' })
    expect(current.kind?.id).toBe('installment')
    expect(current.options.every(option => !option.disabled)).toBe(true)
    expect(current.error).toBe('')
  })

  it('has no instalments until a book is picked, then preselects the next unpaid one', async () => {
    await mount(props)
    expect(current.childOptions).toEqual([])
    await act(async () => current.select('b1'))
    expect(current.childOptions.map(child => child.id)).toEqual(['4', '5', '6'])
    expect(current.childId).toBe('4')
  })

  it('keeps the instalment the user picked, and resets it when another book is picked', async () => {
    await mount(props)
    await act(async () => current.select('b1'))
    await act(async () => current.selectChild('5'))
    expect(current.childId).toBe('5')
    await act(async () => current.select('b2'))
    expect(current.childId).toBe('2')
  })

  it('warns, without blocking, when the instalment amount is not the record amount', async () => {
    await mount({ ...props, amount: '1050000' })
    await act(async () => current.select('b1'))
    expect(current.warning).toContain('مبلغ این قسط')
    expect(current.error).toBe('')
  })

  it('shows no warning when the amounts match or the amount is blank', async () => {
    const rerender = await mount(props)

    await act(async () => current.select('b1'))
    expect(current.warning).toBe('')
    await rerender({ ...props, amount: '' })
    expect(current.warning).toBe('')
  })

  it('adds the record as the payment of the picked instalment', async () => {
    await mount(props)
    await act(async () => current.select('b1'))
    await act(async () => current.selectChild('5'))

    const done = await attachInAct({ recordId: 'r1', amount: 1_000_000, date: '1405-01-01' })

    expect(done).toBe(true)
    expect(mocks.attach).toHaveBeenCalledWith(
      'installment',
      'sid',
      'b1',
      { recordId: 'r1', amount: 1_000_000, date: '1405-01-01' },
      '5'
    )
    expect(mocks.showSuccess).toHaveBeenCalledWith('قسط ۵ از «وام خودرو» پرداخت شد')
  })

  it('keeps the record when the instalment cannot be paid: tells where to link it', async () => {
    mocks.attach.mockRejectedValue(new Error('500'))
    await mount(props)
    await act(async () => current.select('b1'))

    expect(await attachInAct({ recordId: 'r1', amount: 1_000_000, date: '1405-01-01' })).toBe(false)
    expect(mocks.showError).toHaveBeenCalledTimes(1)
    expect(mocks.showError.mock.calls[0][0]).not.toContain('دوباره ذخیره')
  })

  it('forgets book and instalment after a save', async () => {
    await mount(props)
    await act(async () => current.select('b1'))
    await act(async () => current.reset())
    expect(current.selectedId).toBe('')
    expect(current.childId).toBe('')
  })

  it('holds the save back while the list is still being read', async () => {
    let release: (items: typeof books) => void = () => undefined

    mocks.list.mockImplementation(() => new Promise<typeof books>(resolve => (release = resolve)))
    await mount(props)
    expect(current.loading).toBe(true)
    expect(current.blocker).toContain('هنوز خوانده نشده')
    await act(async () => release(books))
    expect(current.loading).toBe(false)
    expect(current.blocker).toBe('')
  })

  it('is off in a building', async () => {
    mocks.personal = false
    await mount(props)
    expect(current.kind).toBeNull()
    expect(mocks.list).not.toHaveBeenCalled()
  })
})
