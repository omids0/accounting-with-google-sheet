import { beforeEach, describe, expect, it } from 'vitest'

import { BUILDING_FIELD_IDS, withBuildingFields, withoutBuildingFields } from './buildingFields'
import { isStandardEntryForm, sortFormFields, withStandardFields } from './fieldUtils'
import {
  hasSharedFields,
  parseSplit,
  SHARED_FIELD_IDS,
  withoutSharedFields,
  withSharedFields
} from './sharedFields'
import { getDefaultForms, getDefaultSettings, normalizeSettings } from '../../services/settings'
import { buildHeaders } from '../../services/sheetsHeaders'
import { setWorkspaceType } from '../../services/workspace'
import type { CustomForm } from '../../types'
import { WRITER_HEADER } from '../../utils/writerColumn'
import { hasBuildingExpenseFields } from '../dataEntry/buildingExpenseEntry'

const form = (type: 'income' | 'expense'): CustomForm => ({
  id: `form_${type}`,
  name: type,
  sheetName: type,
  type,
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'title', label: 'عنوان', type: 'text', required: false },
    { id: 'category', label: 'دسته‌بندی', type: 'select', required: true, options: [] },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    { id: 'note', label: 'توضیحات', type: 'text', required: false }
  ]
})

const ids = (target: CustomForm) => target.fields.map(field => field.id)

/** The personal record headers as they were before the shared account existed. */
const PERSONAL_EXPENSE_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'تاریخ',
  'عنوان',
  'دسته‌بندی',
  'زیردسته',
  'مبلغ',
  'حساب',
  'اثر بر موجودی',
  'طرف حساب',
  'اقلام',
  'توضیحات'
]

describe('shared record fields', () => {
  it('are added to both record forms, at the end of the row, once', () => {
    const [income, expense] = withSharedFields(withSharedFields([form('income'), form('expense')]))

    for (const target of [income, expense]) {
      expect(hasSharedFields(target)).toBe(true)
      expect(ids(target).filter(id => id === 'sharedPayer')).toHaveLength(1)
      expect(
        sortFormFields(target.fields)
          .map(field => field.id)
          .slice(-4)
      ).toEqual(SHARED_FIELD_IDS)
    }
    expect(buildHeaders(expense.fields).slice(-4)).toEqual([
      'پرداخت‌کننده',
      'تقسیم',
      'ایجادکننده',
      'مرجع'
    ])
  })

  it('never use the last-editor column «ثبت‌کننده»', () => {
    const [expense] = withSharedFields([form('expense')])

    expect(buildHeaders(expense.fields)).not.toContain(WRITER_HEADER)
  })

  it('come out again without touching anything else', () => {
    const forms = [form('income'), form('expense')]

    expect(withSharedFields(withSharedFields(forms))).toEqual(withSharedFields(forms))
    expect(withoutSharedFields(withSharedFields(forms))).toEqual(forms)
  })

  it('leave out the wallet, counterparty and line items of a personal form', () => {
    const [income, expense] = withSharedFields(getDefaultForms())

    for (const target of [income, expense]) {
      expect(ids(target).some(id => id.startsWith('wallet'))).toBe(false)
      expect(ids(target)).not.toContain('counterparty')
      expect(ids(target)).not.toContain('lineItems')
      expect(isStandardEntryForm(target)).toBe(true)
    }
  })

  it('are not building fields, and the building helpers leave them alone', () => {
    const [expense] = withSharedFields([form('expense')])

    expect(hasBuildingExpenseFields(expense)).toBe(false)
    expect(withoutBuildingFields([expense])).toEqual([expense])
    expect(withoutSharedFields(withBuildingFields([form('expense')]))[0].fields).toEqual(
      expect.arrayContaining(
        BUILDING_FIELD_IDS.map(id => expect.objectContaining({ id }) as unknown)
      )
    )
  })

  it('only a shared workspace gets them from the standard fields', () => {
    const [personal] = withStandardFields([form('expense')])
    const [shared] = withStandardFields([form('expense')], false, true)
    const [personalAgain] = withStandardFields([shared])

    expect(hasSharedFields(personal)).toBe(false)
    expect(hasSharedFields(shared)).toBe(true)
    expect(ids(shared)).not.toContain('walletAccount')
    expect(hasSharedFields(personalAgain)).toBe(false)
    expect(ids(personalAgain)).toContain('walletAccount')
  })
})

describe('normalizeSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('shared-1', 'shared')
  })

  it('gives the shared workspace the shared forms and a personal sheet its own headers', () => {
    const base = getDefaultSettings()
    const shared = normalizeSettings({ ...base, spreadsheetId: 'shared-1' })
    const personal = normalizeSettings({ ...shared, spreadsheetId: 'personal-1' })
    const expenseOf = (forms: CustomForm[]) => forms.find(item => item.type === 'expense')!

    expect(shared.forms.every(hasSharedFields)).toBe(true)
    expect(personal.forms.some(hasSharedFields)).toBe(false)
    expect(buildHeaders(expenseOf(personal.forms).fields)).toEqual(PERSONAL_EXPENSE_HEADERS)
    expect(buildHeaders(expenseOf(base.forms).fields)).toEqual(PERSONAL_EXPENSE_HEADERS)
  })
})

describe('parseSplit', () => {
  it('reads «only:<email>» and treats anything else as equal', () => {
    expect(parseSplit('equal')).toBe('equal')
    expect(parseSplit('')).toBe('equal')
    expect(parseSplit('nonsense')).toBe('equal')
    expect(parseSplit('only:')).toBe('equal')
    expect(parseSplit(' only: B@Mail.com ')).toBe('only:b@mail.com')
  })
})
