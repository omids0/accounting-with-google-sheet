import { buildingLabel } from './buildingLabel'
import { loadBuildingSummary } from './buildingSummary'
import { registerWorkspaceSpreadsheet } from './buildingTemplate'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { setWorkspaceType } from './workspace'

export const NOT_A_BUILDING_MESSAGE = 'این شیت ساختمان نیست'

/**
 * Lists a sheet someone shared on this device as the workspace its «نوع فضا» row names, once
 * that row was read (nothing is switched or written to the sheet). Used by «اتصال به شیت موجود»
 * of a building and «اتصال به حساب مشترک».
 */
export function registerConnectedSheet(
  spreadsheetId: string,
  type: 'building' | 'shared',
  title: string
): void {
  setWorkspaceType(spreadsheetId, type)
  registerWorkspaceSpreadsheet(spreadsheetId, title, type)
}

/**
 * «اتصال به شیت موجود»: reads the sheet straight from Sheets and, when it carries the «نوع فضا =
 * ساختمان» row, lists it on this device as a building. The role comes from the sheet's own
 * `نقش:<email>` rows (an unknown e-mail reads as a board member).
 * Returns false for a sheet that is not a building; throws when it cannot be read.
 */
export async function connectBuilding(spreadsheetId: string, title?: string): Promise<boolean> {
  const summary = await loadBuildingSummary(spreadsheetId, true)

  if (!summary) throw new Error('شیت خوانده نشد؛ دسترسی و اتصال اینترنت را بررسی کنید')
  if (!summary.isBuilding) return false

  registerConnectedSheet(
    spreadsheetId,
    'building',
    title || formatSpreadsheetTitle(buildingLabel(summary.name))
  )

  return true
}
