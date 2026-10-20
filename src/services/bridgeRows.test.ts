import { describe, expect, it } from 'vitest'

import {
  bridgePaymentOperations,
  bridgeReference,
  ownChargeOperation,
  pocketReceivable,
  pocketReceivableOperation
} from './bridgeRows'
import { isManagerDebtor } from './bridgeTarget'
import { receivableToRow, remainingAmount, rowToReceivable } from './receivablesRow'
import { getDefaultSettings } from './settings'
import { RECEIVABLES_SHEET, WALLET_LEDGER_SHEET, WALLET_SHEET } from './sheetNames'
import { buildHeaders, mapRowToValues, buildFieldColumnMap } from './sheetsHeaders'
import type { OutboxOperation } from './syncOutbox'
import { SUBCATEGORY_FIELD_ID } from '../components/form/fieldUtils'
import type { CustomForm } from '../types'

const forms = getDefaultSettings().forms

const expenseForm = forms.find(form => form.type === 'expense') as CustomForm

const incomeForm = forms.find(form => form.type === 'income') as CustomForm

const POCKET = {
  recordId: 'rec-1',
  building: 'ساختمان نرگس',
  title: 'سرویس آسانسور',
  amount: 2_400_000,
  date: '2025-09-30',
  email: 'Manager@Example.com'
}

/** What the personal sheet holds after the receivable was written, as a direct read returns it. */
const sheetWith = (...rows: string[][]) => [
  ['شناسه', 'زمان ثبت', 'عنوان', 'طرف حساب', 'دسته‌بندی', 'مبلغ'],
  ...rows
]

const walletRow = ['acc-1', '', 'ملت', '5000000', '', 'bank']

const valuesOf = (form: CustomForm, row: string[]) =>
  mapRowToValues(row, form.fields, buildFieldColumnMap(buildHeaders(form.fields), form.fields))

describe('Bridge A: the manager paid from their pocket', () => {
  it('writes a receivable of the building, category «طلب», with the record id in note and reference', () => {
    const receivable = pocketReceivable(POCKET)

    expect(receivable).toMatchObject({
      id: 'bridge-rec-1',
      debtor: 'ساختمان نرگس',
      category: 'طلب',
      amount: 2_400_000,
      borrowDate: '2025-09-30',
      payments: [],
      writer: 'manager@example.com',
      reference: bridgeReference('rec-1')
    })
    expect(receivable.note).toContain('rec-1')
  })

  it('is an append to the personal receivables tab, in the receivable row layout', () => {
    const operation = pocketReceivableOperation(POCKET)

    expect(operation).toMatchObject({ type: 'append', sheetName: RECEIVABLES_SHEET })
    expect(operation.type === 'append' && operation.row).toEqual(
      receivableToRow(pocketReceivable({ ...POCKET })).map((cell, index) =>
        index === 1 ? expect.any(String) : cell
      )
    )
    // The reference column is where the settle step finds it again.
    expect((operation as { row: string[] }).row[11]).toBe('bridge:rec-1')
  })

  it('does not stamp a new «آخرین عملیات»: a bridged write is no new user action', () => {
    expect(pocketReceivableOperation(POCKET)).toMatchObject({
      writeOptions: { skipActivity: true }
    })
  })
})

describe('Bridge A: settling the dang pays the bridged receivable', () => {
  const receivableRow = receivableToRow(pocketReceivable(POCKET))

  const input = {
    recordId: 'rec-1',
    amount: 2_400_000,
    date: '2025-10-12',
    account: 'acc-1',
    receivableRows: sheetWith(receivableRow),
    walletRows: [['شناسه'], walletRow],
    incomeForm
  }

  it('writes the income, the payment on the receivable, the balance and the history', () => {
    const operations = bridgePaymentOperations(input) as OutboxOperation[]

    expect(operations.map(op => [op.type, op.sheetName])).toEqual([
      ['append', incomeForm.sheetName],
      ['update', RECEIVABLES_SHEET],
      ['update', WALLET_SHEET],
      ['append', WALLET_LEDGER_SHEET]
    ])

    const [income, receivable, wallet, ledger] = operations as unknown as [
      { row: string[] },
      { row: string[]; rowNumber: number; expectedRow: string[] },
      { row: string[]; rowNumber: number },
      { row: string[] }
    ]

    expect(valuesOf(incomeForm, income.row)).toMatchObject({
      amount: '2400000',
      category: 'طلب',
      walletAccount: 'acc-1',
      walletApply: 'بله',
      date: '2025-10-12'
    })

    const paid = rowToReceivable(receivable.row, receivable.rowNumber)

    expect(receivable.rowNumber).toBe(2)
    expect(receivable.expectedRow).toEqual(receivableRow)
    expect(remainingAmount(paid)).toBe(0)
    expect(paid.payments[0]).toMatchObject({
      amount: 2_400_000,
      paidAt: '2025-10-12',
      transactionRecordId: income.row[0]
    })

    // The chosen personal account gains the money and its history says why.
    expect(wallet.rowNumber).toBe(2)
    expect(wallet.row[3]).toBe('7400000')
    expect(ledger.row.slice(2, 6)).toEqual(['acc-1', '2025-10-12', '2400000', '7400000'])
  })

  it('records the income without an account and moves no balance when none is chosen', () => {
    const operations = bridgePaymentOperations({ ...input, account: '' }) as OutboxOperation[]

    expect(operations.map(op => op.sheetName)).toEqual([incomeForm.sheetName, RECEIVABLES_SHEET])
    expect(valuesOf(incomeForm, (operations[0] as { row: string[] }).row)).toMatchObject({
      walletAccount: '',
      walletApply: ''
    })
  })

  it('pays no more than what is still owed', () => {
    const operations = bridgePaymentOperations({ ...input, amount: 9_000_000 }) as OutboxOperation[]

    expect(valuesOf(incomeForm, (operations[0] as { row: string[] }).row).amount).toBe('2400000')
  })

  it('writes nothing when the receivable was deleted or is paid already', () => {
    expect(bridgePaymentOperations({ ...input, receivableRows: sheetWith() })).toBeNull()

    const paidRow = receivableToRow({
      ...pocketReceivable(POCKET),
      payments: [{ id: 'p', amount: 2_400_000, paidAt: '', note: '' }]
    })

    expect(bridgePaymentOperations({ ...input, receivableRows: sheetWith(paidRow) })).toBeNull()
  })
})

describe('Bridge B: the manager paid their own unit', () => {
  const operation = ownChargeOperation(
    expenseForm,
    { building: 'ساختمان نرگس', unitNumber: '۳', amount: 1_200_000, date: '2025-10-02' },
    { recordId: 'exp-1', createdAt: 'now' }
  )

  it('is a personal expense «خانه › شارژ» with the same amount and date', () => {
    expect(operation).toMatchObject({ type: 'append', sheetName: expenseForm.sheetName })
    expect(valuesOf(expenseForm, (operation as { row: string[] }).row)).toMatchObject({
      category: 'خانه',
      [SUBCATEGORY_FIELD_ID]: 'شارژ',
      amount: '1200000',
      date: '2025-10-02',
      note: 'شارژ واحد ۳ · ساختمان نرگس'
    })
    expect((operation as { row: string[] }).row.slice(0, 2)).toEqual(['exp-1', 'now'])
  })

  it('names no wallet account, so no personal balance moves', () => {
    expect(valuesOf(expenseForm, (operation as { row: string[] }).row)).toMatchObject({
      walletAccount: '',
      walletApply: ''
    })
  })
})

describe('the «من» flag', () => {
  const persons = [{ id: 'p1', me: true }, { id: 'p2', me: false }, { id: 'p3' }]

  it('offers Bridge B only for the manager flagged person', () => {
    expect(isManagerDebtor({ id: 'p1' }, persons)).toBe(true)
    expect(isManagerDebtor({ id: 'p2' }, persons)).toBe(false)
    expect(isManagerDebtor({ id: 'p3' }, persons)).toBe(false)
  })

  it('never offers it for a unit nobody pays for or an unknown person', () => {
    expect(isManagerDebtor(null, persons)).toBe(false)
    expect(isManagerDebtor({ id: 'ghost' }, persons)).toBe(false)
  })
})
