import { budgetToRow, rowToBudget, threeMonthAverage } from './budgets'
import { getDateFieldId } from './dashboardAggregation'
import { exportSheetCsv, importSheetCsv } from './importExport'
import { BUDGETS_HEADERS } from './sheetHeaders'
import { BUDGETS_SHEET } from './sheetNames'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchRecords,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import type { AppSettings, CategoryBudget } from '../types'
import { getJalaliMonthKey } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'

type SheetBudget = CategoryBudget & { rowNumber: number }

async function fetchSheetBudgets(spreadsheetId: string): Promise<SheetBudget[]> {
  const rows = await fetchSheetRows(spreadsheetId, BUDGETS_SHEET)

  return rows.flatMap((row, index) => {
    const budget = rowToBudget(row)

    return budget ? [{ ...budget, rowNumber: index + 2 }] : []
  })
}

/** Every budget; empty when the tab does not exist yet. */
export async function fetchBudgets(spreadsheetId: string): Promise<CategoryBudget[]> {
  try {
    return (await fetchSheetBudgets(spreadsheetId)).map(({ rowNumber: _, ...budget }) => budget)
  } catch {
    return []
  }
}

/** Sets the category's monthly budget, replacing an earlier one. */
export async function saveBudget(
  spreadsheetId: string,
  category: string,
  amount: number
): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, BUDGETS_SHEET, BUDGETS_HEADERS)

  const row = budgetToRow({ category, amount, updatedAt: new Date().toLocaleString('fa-IR') })
  const current = (await fetchSheetBudgets(spreadsheetId)).find(item => item.category === category)

  if (current) await updateSheetRow(spreadsheetId, BUDGETS_SHEET, current.rowNumber, row)
  else await appendSheetRow(spreadsheetId, BUDGETS_SHEET, row)
}

export async function deleteBudget(spreadsheetId: string, category: string): Promise<void> {
  const current = (await fetchSheetBudgets(spreadsheetId)).find(item => item.category === category)

  if (current) await deleteSheetRow(spreadsheetId, BUDGETS_SHEET, current.rowNumber)
}

/** «میانگین ۳ ماه اخیرت» for the budget sheet; 0 without history. */
export async function loadBudgetSuggestion(
  settings: AppSettings,
  category: string
): Promise<number> {
  const form = settings.forms.find(item => item.type === 'expense')

  if (!form) return 0

  const records = await fetchRecords(settings.spreadsheetId, form)

  return threeMonthAverage(
    records,
    getDateFieldId(form),
    category,
    getJalaliMonthKey(getTodayIso())
  )
}

export async function exportBudgetsCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, BUDGETS_SHEET, BUDGETS_HEADERS, 'بودجه.csv')
}

/** Rows keyed by category: a category that already has a budget is skipped. */
export async function importBudgetsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, BUDGETS_SHEET, BUDGETS_HEADERS, csvContent, cells => {
    const budget = rowToBudget(cells)

    return budget
      ? budgetToRow({
          ...budget,
          updatedAt: budget.updatedAt || new Date().toLocaleString('fa-IR')
        })
      : null
  })
}
