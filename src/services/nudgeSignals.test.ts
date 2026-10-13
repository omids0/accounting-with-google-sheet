import { beforeEach, describe, expect, it, vi } from 'vitest'

const sheets: Record<string, string[][] | null> = {}

vi.mock('./spreadsheetStore', () => ({
  getSheetDataRows: (_id: string, name: string) => sheets[name] ?? null
}))

const signals = await import('./nudgeSignals')

const ID = 'sheet-1'

function setSheets(next: Record<string, string[][] | null>) {
  for (const key of Object.keys(sheets)) delete sheets[key]
  Object.assign(sheets, next)
}

const check = (name: string) => ['c', 't', '12', name, '100']
const dang = (name: string) => ['d', 't', 'عنوان', 'دسته', name, '100']
const receivable = (name: string) => ['r', 't', 'عنوان', name]

describe('nudge signals', () => {
  beforeEach(() => setSheets({}))

  it('vehicle expense: only «سایر», target is the vehicles tab', () => {
    expect(signals.detectVehicleExpense(ID, 'v1')).toBeNull()
    expect(signals.detectVehicleExpense(ID, 'سایر')).toEqual({
      id: 'vehicle-expense',
      targetHasData: false
    })
    setSheets({ خودرو: [['v1', 't', 'پراید']] })
    expect(signals.detectVehicleExpense(ID, 'سایر')?.targetHasData).toBe(true)
  })

  it('first check: only the first, target is the checks reminder rule', () => {
    setSheets({ 'چک‌ها': [check('علی')], یادآوری: [['checks', 'false', '1', '9', '0']] })
    expect(signals.detectFirstCheck(ID)).toEqual({ id: 'check-reminder', targetHasData: false })

    setSheets({ 'چک‌ها': [check('علی')], یادآوری: [] })
    expect(signals.detectFirstCheck(ID)?.targetHasData).toBe(true)

    setSheets({ 'چک‌ها': [check('علی'), check('رضا')], یادآوری: [] })
    expect(signals.detectFirstCheck(ID)).toBeNull()
  })

  it('counterparty: the third use across checks, dang and receivables', () => {
    setSheets({ 'چک‌ها': [check('علی رضایی')], دنگ: [dang(' علی  رضایی ')] })
    expect(signals.detectRepeatedCounterparty(ID, 'علی رضایی')).toBeNull()

    sheets['طلب‌ها'] = [receivable('علی رضایی')]
    expect(signals.detectRepeatedCounterparty(ID, 'علی رضایی')).toEqual({
      id: 'counterparty',
      targetHasData: false
    })

    sheets['طرف_حساب‌ها'] = [['p', 't', 'علی', 'رضایی']]
    expect(signals.detectRepeatedCounterparty(ID, 'علی رضایی')?.targetHasData).toBe(true)
    expect(signals.detectRepeatedCounterparty(ID, '  ')).toBeNull()
  })

  it('missing accounts: ten in a row and at least one wallet account', () => {
    setSheets({ 'کیف پول': [['a1', 'ملت']] })
    expect(signals.detectMissingAccounts(ID, 9)).toBeNull()
    expect(signals.detectMissingAccounts(ID, 10)).toEqual({
      id: 'record-account',
      targetHasData: false
    })
    setSheets({ 'کیف پول': [] })
    expect(signals.detectMissingAccounts(ID, 12)).toBeNull()
  })
})
