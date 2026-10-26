import { sortFormFields } from '../components/form/fieldUtils'
import type { FieldConfig } from '../types'
import {
  BUILDING_MODULE_SHEET_SPECS,
  BUILDING_SHEET_SPECS,
  MODULE_SHEET_SPECS,
  SHARED_SHEET_SPECS
} from './moduleSheetSpecs'
import { getDefaultSettings, getSettings } from './settings'
import type { SheetSpec } from './sheets'
import { workspaceTypeOf } from './workspace'

function buildHeaders(form: { fields: FieldConfig[] }): string[] {
  return ['شناسه', 'زمان ثبت', ...sortFormFields(form.fields).map(field => field.label)]
}

/**
 * The tabs of `spreadsheetId` (default: the active one). A building gets its own tabs and
 * none of the personal-only ones, a shared account only the tabs it needs; a personal
 * spreadsheet never gets the building tabs.
 */
export function getAllSheetSpecs(spreadsheetId?: string): SheetSpec[] {
  const settings = getSettings() ?? getDefaultSettings()

  const formSheets = settings.forms.map(form => ({
    sheetName: form.sheetName,
    headers: buildHeaders(form)
  }))

  const type = workspaceTypeOf(spreadsheetId)

  // A building file has only the tabs a building uses: not the personal-only ones.
  if (type === 'building') {
    return [...formSheets, ...BUILDING_MODULE_SHEET_SPECS, ...BUILDING_SHEET_SPECS]
  }
  // A shared account has the two record forms and the few tabs the engine needs, nothing more.
  if (type === 'shared') return [...formSheets, ...SHARED_SHEET_SPECS]

  return [...formSheets, ...MODULE_SHEET_SPECS]
}
