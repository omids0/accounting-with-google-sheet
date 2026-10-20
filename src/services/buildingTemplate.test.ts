import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildingForms,
  buildingProfileRow,
  buildTemplateRows,
  createBuildingSpreadsheet,
  type BuildingProfile,
  type FundAccountInput
} from './buildingTemplate'
import { BUILDING_EXPENSE_CATEGORIES, BUILDING_INCOME_CATEGORIES } from './buildingTemplateData'
import { rowsToGroups, rowsToSubcategories } from './categoryGroups'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { WALLET_HEADERS } from './sheetHeaders'
import { getWorkspaceType } from './workspace'

const api = vi.hoisted(() => ({
  createSpreadsheet: vi.fn(),
  ensureManySheetsWithHeaders: vi.fn(),
  appendSheetRowsApi: vi.fn(),
  calls: [] as string[]
}))

vi.mock('./sheetsCreate', () => ({
  createSpreadsheet: (...args: unknown[]) => {
    api.calls.push('create')

    return api.createSpreadsheet(...args)
  }
}))

vi.mock('./sheetsEnsure', () => ({
  ensureManySheetsWithHeaders: (...args: unknown[]) => {
    api.calls.push('ensure')

    return api.ensureManySheetsWithHeaders(...args)
  }
}))

vi.mock('./sheetsOutboxApi', () => ({
  appendSheetRowsApi: (...args: unknown[]) => {
    api.calls.push(`append:${String(args[1])}`)

    return api.appendSheetRowsApi(...args)
  }
}))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => 'Manager@Example.com'
}))

const PROFILE: BuildingProfile = {
  name: ' نرگس ',
  address: 'خیابان گل‌ها',
  floors: 4,
  defaultCharge: 1_500_000,
  chargeMethod: 'area',
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'half'
}

const ACCOUNTS: FundAccountInput[] = [
  { title: 'حساب ساختمان', type: 'bank', cardNumber: '6037991234567890', balance: 12_000_000 },
  { title: 'تنخواه', type: 'cash', cardNumber: '6037000000000000', balance: 0 }
]

const NOW = new Date('2026-10-20T10:00:00Z')

describe('building template rows', () => {
  it('mark the sheet as a building and make the creator its manager', () => {
    const { period } = buildTemplateRows(PROFILE, ACCOUNTS, 'Manager@Example.com', NOW)

    expect(period.map(row => row.slice(0, 2))).toEqual([
      ['نوع فضا', 'ساختمان'],
      ['نقش:manager@example.com', 'manager']
    ])
  })

  it('skip the role row when nobody is signed in', () => {
    expect(buildTemplateRows(PROFILE, ACCOUNTS, '', NOW).period).toHaveLength(1)
  })

  it('hold the building profile in one row', () => {
    const { building } = buildTemplateRows(PROFILE, ACCOUNTS, 'a@b.c', NOW)

    expect(building).toHaveLength(1)
    expect(building[0].slice(0, 8)).toEqual([
      'نرگس',
      'خیابان گل‌ها',
      '4',
      '1500000',
      'area',
      '1',
      '10',
      'half'
    ])
    expect(buildingProfileRow(PROFILE, 'x')).toHaveLength(9)
  })

  it('replace the personal category lists with the building ones, system categories included', () => {
    const { categories } = buildTemplateRows(PROFILE, ACCOUNTS, 'a@b.c', NOW)

    const groups = rowsToGroups(categories)

    const subcategories = rowsToSubcategories(categories)

    expect(groups.expense).toEqual(BUILDING_EXPENSE_CATEGORIES)
    expect(groups.income).toEqual(BUILDING_INCOME_CATEGORIES)
    expect(groups.expense).toEqual(
      expect.arrayContaining(['آسانسور', 'انتقال', 'اصلاح موجودی', 'سایر'])
    )
    expect(groups.income).toEqual(expect.arrayContaining(['شارژ ساختمان', 'طلب', 'سایر']))
    expect(groups.expense).not.toContain('خوراک')
    expect(groups.receivable).toContain('شارژ ساختمان')
    expect(subcategories.expense['قبوض مشاعات']).toEqual(['برق', 'آب', 'گاز'])
    expect(subcategories.income['اجارهٔ مشاعات']).toEqual(['پشت‌بام', 'آنتن', 'انباری'])
    // Lists the building does not replace stay empty: the usual defaults are seeded on first use.
    expect(groups.dang).toEqual([])
  })

  it('create every fund account, bank cards only on bank accounts', () => {
    const { wallet } = buildTemplateRows(PROFILE, ACCOUNTS, 'a@b.c', NOW)

    const column = (name: string) => WALLET_HEADERS.indexOf(name)

    expect(wallet).toHaveLength(2)
    expect(wallet.map(row => row[column('عنوان')])).toEqual(['حساب ساختمان', 'تنخواه'])
    expect(wallet.map(row => row[column('موجودی')])).toEqual(['12000000', '0'])
    expect(wallet.map(row => row[column('نوع حساب')])).toEqual(['بانکی', 'نقدی'])
    expect(wallet.map(row => row[column('شماره کارت')])).toEqual(['6037991234567890', ''])
  })

  it('log the opening balance of an account that starts with money', () => {
    const { wallet, ledger } = buildTemplateRows(PROFILE, ACCOUNTS, 'a@b.c', NOW)

    expect(ledger).toHaveLength(1)
    expect(ledger[0][2]).toBe(wallet[0][0])
    expect(ledger[0][4]).toBe('12000000')
    expect(ledger[0][5]).toBe('12000000')
    expect(ledger[0][7]).toBe('موجودی اولیه')
  })
})

describe('building forms', () => {
  it('carry the building fields on the expense form only', () => {
    const [income, expense] = buildingForms()

    expect(income.fields.some(field => field.id === 'payer')).toBe(false)
    expect(expense.fields.map(field => field.id)).toEqual(
      expect.arrayContaining(['expenseKind', 'split', 'payer'])
    )
  })
})

describe('createBuildingSpreadsheet', () => {
  beforeEach(() => {
    localStorage.clear()
    api.calls.length = 0
    api.createSpreadsheet.mockReset().mockResolvedValue('new-building')
    api.ensureManySheetsWithHeaders.mockReset().mockResolvedValue(undefined)
    api.appendSheetRowsApi.mockReset().mockResolvedValue(undefined)
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [{ id: 'personal-1', name: 'حسابداری · ۱۴۰۵', createdAt: '' }]
    })
  })

  it('creates «حسابداری · ساختمان <name>» with the building forms', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    const [title, forms] = api.createSpreadsheet.mock.calls[0]

    expect(title).toBe('حسابداری · ساختمان نرگس')
    expect((forms as ReturnType<typeof buildingForms>)[1].fields.some(f => f.id === 'payer')).toBe(
      true
    )
  })

  it('creates the tabs it writes, then writes the rows of each', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    expect(api.calls).toEqual([
      'create',
      'ensure',
      'append:تنظیمات دوره',
      'append:دسته‌بندی‌ها',
      'append:ساختمان',
      'append:کیف پول',
      'append:گردش حساب'
    ])

    const specs = api.ensureManySheetsWithHeaders.mock.calls[0][1] as { sheetName: string }[]

    expect(specs.map(spec => spec.sheetName).sort()).toEqual(
      ['تنظیمات دوره', 'دسته‌بندی‌ها', 'ساختمان', 'کیف پول', 'گردش حساب'].sort()
    )
  })

  it('lists it as a building without activating it, and remembers the type', async () => {
    const id = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    const settings = getSettings()

    expect(id).toBe('new-building')
    expect(settings?.spreadsheetId).toBe('personal-1')
    expect(settings?.spreadsheets?.find(sheet => sheet.id === id)).toMatchObject({
      name: 'حسابداری · ساختمان نرگس',
      kind: 'building'
    })
    expect(settings?.spreadsheets?.find(sheet => sheet.id === 'personal-1')?.kind).toBeUndefined()
    expect(getWorkspaceType(id)).toBe('building')
    expect(getWorkspaceType('personal-1')).toBe('personal')
  })

  it('leaves the personal spreadsheet and its forms untouched', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    const expense = getSettings()?.forms.find(form => form.type === 'expense')

    expect(expense?.fields.some(field => field.id === 'payer')).toBe(false)
    expect(api.appendSheetRowsApi.mock.calls.every(call => call[0] === 'new-building')).toBe(true)
  })
})
