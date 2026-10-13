import type * as CapacitorCore from '@capacitor/core'
import { describe, expect, it, vi } from 'vitest'

const { setSnapshot, native } = vi.hoisted(() => ({ setSnapshot: vi.fn(), native: { on: false } }))

vi.mock('@capacitor/core', async importOriginal => ({
  ...(await importOriginal<typeof CapacitorCore>()),
  Capacitor: { isNativePlatform: () => native.on, getPlatform: () => 'web' },
  registerPlugin: () => ({ setSnapshot })
}))

const { accountsLabelOf, formatWidgetAmount, formatWidgetShort, snapshotFrom } = await import(
  './widgetSnapshot'
)
const { pushWidgetSnapshot, sendWidgetSnapshot } = await import('./widgetNative')

const data = {
  totalExpense: 19_400_000,
  monthLabel: 'مهر',
  financial: { netAvailable: 29_770_000 }
}
const bank = (title: string) => ({ title, bankId: 'b', accountKind: 'bank' })

describe('snapshotFrom', () => {
  it('maps the dashboard numbers and the first due item', () => {
    const snapshot = snapshotFrom({
      data,
      reminders: [
        { title: 'وام مسکن', dueDate: '2026-09-27', amount: 4_000_000 },
        { title: 'چک', dueDate: '2026-10-20', amount: 1 }
      ],
      pendingSms: 3,
      hidden: false,
      sheetLabel: 'خانه',
      accounts: [bank('ملت'), bank('سامان')],
      now: new Date('2026-10-13T10:05:00Z')
    })

    expect(snapshot).toEqual({
      netAvailable: 29_770_000,
      monthExpense: 19_400_000,
      monthLabel: 'مهر',
      pendingSms: 3,
      nextDue: { title: 'وام مسکن', day: '۵ مهر', amount: 4_000_000 },
      updatedAt: '2026-10-13T10:05:00.000Z',
      hidden: false,
      sheetLabel: 'خانه',
      accountsLabel: 'ملت و سامان'
    })
  })

  it('keeps the hidden flag and works without a due item', () => {
    const snapshot = snapshotFrom({
      data,
      reminders: [],
      pendingSms: 0,
      hidden: true,
      sheetLabel: '',
      accounts: []
    })

    expect(snapshot.hidden).toBe(true)
    expect(snapshot.nextDue).toBeNull()
    expect(snapshot.accountsLabel).toBe('')
  })

  it('names two bank accounts, then counts the rest', () => {
    const cash = { title: 'نقدی', bankId: '', accountKind: 'cash' }

    expect(accountsLabelOf([bank('ملت'), cash, bank('سامان'), bank('ملی'), bank('تجارت')])).toBe(
      'ملت و سامان و ۲ دیگر'
    )
  })
})

describe('widget amounts', () => {
  it('formats the big amount with Persian digits and separators', () => {
    expect(formatWidgetAmount(29_770_000)).toBe('۲۹٬۷۷۰٬۰۰۰')
  })

  it('shortens to millions, thousands or the plain number', () => {
    expect(formatWidgetShort(29_770_000)).toBe('۲۹٫۸ م')
    expect(formatWidgetShort(850_000)).toBe('۸۵۰ هزار')
    expect(formatWidgetShort(12_000)).toBe('۱۲٬۰۰۰')
    expect(formatWidgetShort(-2_500_000)).toBe('−۲٫۵ م')
  })
})

describe('widget bridge', () => {
  it('never calls the plugin on the web', async () => {
    native.on = false
    pushWidgetSnapshot('sheet')
    await sendWidgetSnapshot('sheet')

    expect(setSnapshot).not.toHaveBeenCalled()
  })

  it('sends «empty» when there is no spreadsheet', async () => {
    native.on = true
    await sendWidgetSnapshot('')

    expect(setSnapshot).toHaveBeenCalledWith({ json: '{"empty":true}' })
    native.on = false
  })
})
