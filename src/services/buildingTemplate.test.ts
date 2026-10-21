import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initialJourneyState, JOURNEY_ROW } from './buildingJourney'
import {
  buildingForms,
  buildingProfileRow,
  buildTemplateRows,
  createBuildingSpreadsheet,
  type BuildingProfile,
  type FundAccountInput
} from './buildingTemplate'
import { BUILDING_EXPENSE_CATEGORIES, BUILDING_INCOME_CATEGORIES } from './buildingTemplateData'
import { rowsToGroups, rowsToSubcategories, withDefaults } from './categoryGroups'
import { MEMBERSHIP_DATE_KEY } from './periodSettings'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { WALLET_HEADERS } from './sheetHeaders'
import {
  BUILDING_RESIDENTS_SHEET,
  BUILDING_SHEET,
  BUILDING_UNITS_SHEET,
  CHECKS_SHEET,
  DANG_SHEET,
  PERSONAL_ONLY_SHEETS,
  RECEIVABLES_SHEET,
  WALLET_SHEET
} from './sheetNames'
import type { NewSheetTab } from './sheetsCreate'
import { takeFreshlyCreated } from './spreadsheetPreparedSession'
import { getWorkspaceType } from './workspace'

const api = vi.hoisted(() => ({
  createSpreadsheet: vi.fn(),
  calls: [] as string[]
}))

vi.mock('./sheetsCreate', () => ({
  createSpreadsheet: (...args: unknown[]) => {
    api.calls.push('create')

    return api.createSpreadsheet(...args)
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
      [MEMBERSHIP_DATE_KEY, expect.any(String)],
      ['نقش:manager@example.com', 'manager']
    ])
  })

  it('skip the role row when nobody is signed in', () => {
    expect(buildTemplateRows(PROFILE, ACCOUNTS, '', NOW).period).toHaveLength(2)
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
    // The lists the building does not replace carry the usual defaults from the start, so the
    // first open finds nothing empty to seed and writes nothing back.
    expect(groups.dang).toEqual(withDefaults(rowsToGroups([])).dang)
    expect(Object.values(groups).every(list => list.length > 0)).toBe(true)
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
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [{ id: 'personal-1', name: 'حسابداری · ۱۴۰۵', createdAt: '' }]
    })
  })

  const tabsOf = () => api.createSpreadsheet.mock.calls[0][2] as NewSheetTab[]

  const rowsOf = (sheetName: string) => tabsOf().find(tab => tab.sheetName === sheetName)?.rows

  it('creates «حسابداری · ساختمان <name>» with the building forms', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    const [title, forms] = api.createSpreadsheet.mock.calls[0]

    expect(title).toBe('حسابداری · ساختمان نرگس')
    expect((forms as ReturnType<typeof buildingForms>)[1].fields.some(f => f.id === 'payer')).toBe(
      true
    )
  })

  it('does not put «ساختمان» in front of a name that already starts with it', async () => {
    await createBuildingSpreadsheet({ ...PROFILE, name: 'ساختمان تست' }, ACCOUNTS)

    expect(api.createSpreadsheet.mock.calls[0][0]).toBe('حسابداری · ساختمان تست')
  })

  it('writes the setup journey row beside the type and role rows when given one', async () => {
    const journey = initialJourneyState({ unitCount: 12 })

    await createBuildingSpreadsheet(PROFILE, ACCOUNTS, journey)

    const rows = rowsOf('تنظیمات دوره') as string[][]

    expect(rows.map(row => row[0])).toContain(JOURNEY_ROW)
    expect(JSON.parse(rows.find(row => row[0] === JOURNEY_ROW)![1])).toEqual(journey)
  })

  it('writes no journey row without one', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    expect((rowsOf('تنظیمات دوره') as string[][]).map(row => row[0])).not.toContain(JOURNEY_ROW)
  })

  it('sends the file, every tab and the first rows in one create call', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    expect(api.calls).toEqual(['create'])
    expect(api.createSpreadsheet).toHaveBeenCalledTimes(1)

    const withRows = tabsOf()
      .filter(tab => tab.rows?.length)
      .map(tab => tab.sheetName)

    expect(withRows.sort()).toEqual(
      ['تنظیمات دوره', 'دسته‌بندی‌ها', 'ساختمان', 'کیف پول', 'گردش حساب'].sort()
    )
  })

  it('creates the tabs a building uses and none of the personal-only ones', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    const names = tabsOf().map(tab => tab.sheetName)

    expect(names).toEqual(
      expect.arrayContaining([
        BUILDING_SHEET,
        BUILDING_UNITS_SHEET,
        BUILDING_RESIDENTS_SHEET,
        WALLET_SHEET,
        RECEIVABLES_SHEET,
        DANG_SHEET,
        CHECKS_SHEET
      ])
    )
    for (const personal of PERSONAL_ONLY_SHEETS) expect(names).not.toContain(personal)
    expect(tabsOf().every(tab => tab.headers.length > 0)).toBe(true)
  })

  it('records the membership date so the first open has nothing to add', async () => {
    await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    expect((rowsOf('تنظیمات دوره') as string[][]).map(row => row[0])).toContain(MEMBERSHIP_DATE_KEY)
  })

  it('marks the new file as freshly created so its first open skips the tab check', async () => {
    const id = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    expect(takeFreshlyCreated(id)).toBe(true)
    expect(takeFreshlyCreated(id)).toBe(false)
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
  })
})
