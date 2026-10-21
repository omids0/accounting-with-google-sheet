import { sortFormFields } from '../components/form/fieldUtils'
import type { FieldConfig } from '../types'
import { BUILDING_SHEET_SPECS, MODULE_SHEET_SPECS } from './moduleSheetSpecs'
import { getDefaultSettings, getSettings } from './settings'
import type { SheetSpec } from './sheets'
import { workspaceTypeOf } from './workspace'

function buildHeaders(form: { fields: FieldConfig[] }): string[] {
  return ['شناسه', 'زمان ثبت', ...sortFormFields(form.fields).map(field => field.label)]
}

/**
 * The tabs of `spreadsheetId` (default: the active one). The building tabs are part of the list
 * only when that spreadsheet is a building, so a personal spreadsheet never gets them.
 */
export function getAllSheetSpecs(spreadsheetId?: string): SheetSpec[] {
  const settings = getSettings() ?? getDefaultSettings()

  const formSheets = settings.forms.map(form => ({
    sheetName: form.sheetName,
    headers: buildHeaders(form)
  }))

  const building = workspaceTypeOf(spreadsheetId) === 'building' ? BUILDING_SHEET_SPECS : []

  return [...formSheets, ...MODULE_SHEET_SPECS, ...building]
}
