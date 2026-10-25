import { deletePeriodSettings, setPeriodSetting } from './periodSettings'
import { assertBuildingSpreadsheet, assertMemberWorkspace } from './workspace'

/**
 * Writers of the building's marker rows in «تنظیمات دوره» (`فهرست:`, `راه‌اندازی`, `آخرین صدور`,
 * …). A building is its own Google Sheets file, so these refuse any spreadsheet that is not a
 * building: neither the personal spreadsheet nor a shared account ever receives one of them.
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

/**
 * Writers of the member rows (`نقش:`, `دسترسی:`, `دعوت:`), shared by a building and a shared
 * account; a personal spreadsheet never receives one of them.
 */
export async function setMemberSetting(
  spreadsheetId: string,
  key: string,
  value: string
): Promise<void> {
  assertMemberWorkspace(spreadsheetId)
  await setPeriodSetting(spreadsheetId, key, value)
}

export async function deleteMemberSettings(spreadsheetId: string, keys: string[]): Promise<void> {
  assertMemberWorkspace(spreadsheetId)
  await deletePeriodSettings(spreadsheetId, keys)
}
