import { logItemActivity } from './activityLog'
import { checkListTitle, headerDirectionColumn } from './checkDirection'
import { rowToCheck } from './checkRows'
import { CHECKS_SHEET, fetchChecks, updateCheck } from './checks'
import {
  mirrorDataRows,
  rowsMentioning,
  type RecordChange,
  type RecordLinkAdapter
} from './recordLinkCore'
import { getSheetRow } from './spreadsheetStore'
import type { Check } from '../types'
import { roundMoney } from '../utils/roundMoney'

/**
 * A check keeps ONE record id (not a list of payments), so it has its own adapter instead of the
 * payments factory. A deleted record reopens the check (unpaid, no link); an edited one moves the
 * date the check was passed. The check's amount is fixed: a record edited to another amount only
 * gets a note. A check pays with an expense (given) or an income (received): one adapter each.
 */
function createCheckRecordLink(recordType: 'income' | 'expense'): RecordLinkAdapter {
  /** The checks whose record is `recordId`, from the local mirror (no network). */
  const checksOf = (spreadsheetId: string, recordId: string) => {
    const column = headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))

    return rowsMentioning(spreadsheetId, CHECKS_SHEET, recordId)
      .map(({ row, rowNumber }) => rowToCheck(row, rowNumber, column))
      .filter(check => check.transactionRecordId === recordId)
  }

  /** The same checks read again by id, so a change made on another device is not overwritten. */
  const freshChecksOf = async (spreadsheetId: string, recordId: string) => {
    const ids = new Set(checksOf(spreadsheetId, recordId).map(check => check.id))

    if (!ids.size) return []

    // Still paid by this record: a check re-paid with another record elsewhere is left alone.
    return (await fetchChecks(spreadsheetId)).filter(
      check => ids.has(check.id) && check.transactionRecordId === recordId
    )
  }

  const write = (spreadsheetId: string, check: Check & { rowNumber: number }, next: Check) =>
    updateCheck(spreadsheetId, check.rowNumber, next, false)

  return {
    kind: 'checks',
    noun: 'چک',
    recordType,

    linkedRecordIds: spreadsheetId => {
      const column = headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))

      return mirrorDataRows(spreadsheetId, CHECKS_SHEET).flatMap(({ row, rowNumber }) => {
        const { transactionRecordId } = rowToCheck(row, rowNumber, column)

        return transactionRecordId ? [transactionRecordId] : []
      })
    },

    findByRecordId: (spreadsheetId, recordId) =>
      checksOf(spreadsheetId, recordId).map(check => ({
        kind: 'checks',
        noun: 'چک',
        itemId: check.id,
        title: checkListTitle(check),
        paymentIds: [check.id]
      })),

    async onRecordDeleted(spreadsheetId, recordId) {
      const notes: string[] = []

      for (const check of await freshChecksOf(spreadsheetId, recordId)) {
        // Only the check is reopened; the record is already gone and so is its balance effect.
        await write(spreadsheetId, check, {
          ...check,
          paid: false,
          paidAt: '',
          transactionRecordId: ''
        })
        logItemActivity(spreadsheetId, 'unpay', 'checks', check.id, checkListTitle(check))
        notes.push(`${checkListTitle(check)} دوباره پاس‌نشده شد، چون تراکنش وصل‌شده‌اش حذف شد.`)
      }

      return notes
    },

    async onRecordUpdated(spreadsheetId, recordId, change: RecordChange) {
      const notes: string[] = []

      for (const check of await freshChecksOf(spreadsheetId, recordId)) {
        if (change.date !== undefined && change.date !== check.paidAt) {
          await write(spreadsheetId, check, { ...check, paidAt: change.date })
          logItemActivity(spreadsheetId, 'update', 'checks', check.id, checkListTitle(check))
        }
        if (change.amount !== undefined && roundMoney(change.amount) !== roundMoney(check.amount)) {
          notes.push(`مبلغ تراکنش دیگر با مبلغ ${checkListTitle(check)} یکی نیست؛ مبلغ چک عوض نشد.`)
        }
      }

      return notes
    }
  }
}

export const checkExpenseRecordLink = createCheckRecordLink('expense')
export const checkIncomeRecordLink = createCheckRecordLink('income')
