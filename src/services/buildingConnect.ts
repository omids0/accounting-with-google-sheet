import { loadBuildingSummary } from './buildingSummary'
import { registerBuildingSpreadsheet } from './buildingTemplate'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { setWorkspaceType } from './workspace'

export const NOT_A_BUILDING_MESSAGE = 'این شیت ساختمان نیست'

/**
 * «اتصال به شیت موجود»: reads the sheet straight from Sheets (nothing is switched or written) and,
 * when it carries the «نوع فضا = ساختمان» row, lists it on this device as a building. The role
 * comes from the sheet's own `نقش:<email>` rows (an unknown e-mail reads as a board member).
 * Returns false for a sheet that is not a building; throws when it cannot be read.
 */
export async function connectBuilding(spreadsheetId: string, title?: string): Promise<boolean> {
  const summary = await loadBuildingSummary(spreadsheetId, true)

  if (!summary) throw new Error('شیت خوانده نشد؛ دسترسی و اتصال اینترنت را بررسی کنید')
  if (!summary.isBuilding) return false

  setWorkspaceType(spreadsheetId, 'building')
  registerBuildingSpreadsheet(
    spreadsheetId,
    title || formatSpreadsheetTitle(`ساختمان ${summary.name}`)
  )

  return true
}
