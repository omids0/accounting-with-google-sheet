import { sortFormFields } from '../components/form/fieldUtils'
import type { FieldConfig } from '../types'
import {
  BUILDING_MODULE_SHEET_SPECS,
  BUILDING_SHEET_SPECS,
  MODULE_SHEET_SPECS
} from './moduleSheetSpecs'
import { getDefaultSettings, getSettings } from './settings'
import type { SheetSpec } from './sheets'
import { workspaceTypeOf } from './workspace'

function buildHeaders(form: { fields: FieldConfig[] }): string[] {
  return ['شناسه', 'زمان ثبت', ...sortFormFields(form.fields).map(field => field.label)]
}

/**
 * The tabs of `spreadsheetId` (default: the active one). A building gets its own tabs and
 * none of the personal-only ones; a personal spreadsheet never gets the building tabs.
 */
export function getAllSheetSpecs(spreadsheetId?: string): SheetSpec[] {
  const settings = getSettings() ?? getDefaultSettings()

  const formSheets = settings.forms.map(form => ({
    sheetName: form.sheetName,
    headers: buildHeaders(form)
  }))

  // A building file has only the tabs a building uses: not the personal-only ones.
  if (workspaceTypeOf(spreadsheetId) === 'building') {
    return [...formSheets, ...BUILDING_MODULE_SHEET_SPECS, ...BUILDING_SHEET_SPECS]
  }

  return [...formSheets, ...MODULE_SHEET_SPECS]
}
