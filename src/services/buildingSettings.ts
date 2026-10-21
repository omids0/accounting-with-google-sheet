import { deletePeriodSettings, setPeriodSetting } from './periodSettings'
import { assertBuildingSpreadsheet } from './workspace'

/**
 * Writers of the building's marker rows in «تنظیمات دوره» (`نقش:`, `دعوت:`, `فهرست:`, `راه‌اندازی`,
 * `آخرین صدور`, …). A building is its own Google Sheets file, so these refuse any spreadsheet
 * that is not a building: the manager's personal spreadsheet never receives one of them.
 */
export async function setBuildingSetting(
  spreadsheetId: string,
  key: string,
  value: string
): Promise<void> {
  assertBuildingSpreadsheet(spreadsheetId)
  await setPeriodSetting(spreadsheetId, key, value)
}

export async function deleteBuildingSettings(spreadsheetId: string, keys: string[]): Promise<void> {
  assertBuildingSpreadsheet(spreadsheetId)
  await deletePeriodSettings(spreadsheetId, keys)
}
