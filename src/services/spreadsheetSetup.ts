import { sortFormFields } from '../components/form/fieldUtils'
import type { FieldConfig, SpreadsheetEntry } from '../types'
import { syncCategoriesFromSheet } from './categories'
import { migrateLegacyMachineExpenseCategory } from './migrateLegacyMachineExpenseCategory'
import { migrateSubCategoryColumn } from './migrateSubCategoryColumn'
import { MODULE_SHEET_SPECS } from './moduleSheetSpecs'
import { ensureMembershipDate } from './periodSettings'
import { getDefaultSettings, getSettings, registerSpreadsheet } from './settings'
import {
  createSpreadsheet,
  ensureManySheetsWithHeaders,
  invalidateSpreadsheetCache,
  markSheetsPrepared,
  verifySpreadsheetExists,
  type SheetSpec
} from './sheets'
import {
  clearInaccessibleSpreadsheet,
  markSpreadsheetInaccessible,
  SPREADSHEET_NO_ACCESS_MESSAGE
} from './spreadsheetAccess'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { syncSpreadsheetsFromDrive } from './spreadsheetDriveSync'
import { getJalaliParts } from '../utils/jalaliDate'

export { syncSpreadsheetsFromDrive }

const SESSION_PREPARED_KEY = 'accounting_sheets_ready'

let activeSpreadsheetSetup: Promise<string> | null = null

export type SpreadsheetSessionStatus =
  | { status: 'ready'; spreadsheetId: string }
  | { status: 'need_selection'; options: SpreadsheetEntry[] }
  | { status: 'need_first_sheet' }

function runExclusiveSpreadsheetSetup(task: () => Promise<string>): Promise<string> {
  if (activeSpreadsheetSetup) {
    return activeSpreadsheetSetup
  }

  activeSpreadsheetSetup = task().finally(() => {
    activeSpreadsheetSetup = null
  })

  return activeSpreadsheetSetup
}

function buildHeaders(form: { fields: FieldConfig[] }): string[] {
  return ['شناسه', 'زمان ثبت', ...sortFormFields(form.fields).map(field => field.label)]
}

function getAllSheetSpecs(): SheetSpec[] {
  const settings = getSettings() ?? getDefaultSettings()

  const formSheets = settings.forms.map(form => ({
    sheetName: form.sheetName,
    headers: buildHeaders(form)
  }))

  return [...formSheets, ...MODULE_SHEET_SPECS]
}

function markAllKnownSheetsPrepared(spreadsheetId: string): void {
  markSheetsPrepared(
    spreadsheetId,
    getAllSheetSpecs().map(sheet => sheet.sheetName)
  )
}

/** Re-check headers at least daily even when nothing in the app changed. */
const PREPARED_MAX_AGE_MS = 24 * 60 * 60_000

/**
 * Kept in localStorage (sessionStorage is wiped every time the PWA closes, which
 * made every cold start re-check all headers). The signature changes whenever an
 * app update adds a sheet or a column, which forces a fresh check.
 */
function preparedSignature(spreadsheetId: string): string {
  const specs = getAllSheetSpecs().map(sheet => `${sheet.sheetName}:${sheet.headers.length}`)

  return `${spreadsheetId}|${specs.join(',')}`
}

function isSessionPrepared(spreadsheetId: string): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_PREPARED_KEY) ?? 'null') as {
      signature?: string
      at?: number
    } | null

    return (
      stored?.signature === preparedSignature(spreadsheetId) &&
      Date.now() - (stored.at ?? 0) < PREPARED_MAX_AGE_MS
    )
  } catch {
    return false
  }
}

function markSessionPrepared(spreadsheetId: string): void {
  try {
    localStorage.setItem(
      SESSION_PREPARED_KEY,
      JSON.stringify({ signature: preparedSignature(spreadsheetId), at: Date.now() })
    )
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function clearSpreadsheetPrepareSession(spreadsheetId?: string): void {
  try {
    localStorage.removeItem(SESSION_PREPARED_KEY)
    sessionStorage.removeItem(SESSION_PREPARED_KEY)
  } catch {
    // Ignore storage failures in private mode.
  }
  if (spreadsheetId) {
    invalidateSpreadsheetCache(spreadsheetId)
  }
}

async function ensureAllSheets(spreadsheetId: string): Promise<void> {
  await ensureManySheetsWithHeaders(spreadsheetId, getAllSheetSpecs())
}

export async function resolveSpreadsheetSession(): Promise<SpreadsheetSessionStatus> {
  const settings = getSettings() ?? getDefaultSettings()

  const activeId = settings.spreadsheetId

  if (activeId && (await verifySpreadsheetExists(activeId))) {
    clearInaccessibleSpreadsheet()

    return { status: 'ready', spreadsheetId: activeId }
  }

  if (activeId) {
    // Usually a sheet copied by hand in Drive: drive.file never let the app see it.
    markSpreadsheetInaccessible(
      settings.spreadsheets?.find(sheet => sheet.id === activeId) ?? {
        id: activeId,
        name: activeId,
        createdAt: ''
      }
    )
  }

  const options = (await syncSpreadsheetsFromDrive()).filter(sheet => sheet.id !== activeId)

  if (options.length > 0) {
    return { status: 'need_selection', options }
  }

  return { status: 'need_first_sheet' }
}

async function finalizeSpreadsheetActivation(
  spreadsheetId: string,
  name: string,
  previousId?: string
): Promise<string> {
  registerSpreadsheet(spreadsheetId, name)
  clearInaccessibleSpreadsheet()
  if (previousId && previousId !== spreadsheetId) {
    clearSpreadsheetPrepareSession(previousId)
  }

  if (isSessionPrepared(spreadsheetId)) {
    markAllKnownSheetsPrepared(spreadsheetId)
    // Headers are known good; categories may have changed on another device.
    void syncCategoriesFromSheet(spreadsheetId).catch(() => undefined)

    return spreadsheetId
  }

  await ensureAllSheets(spreadsheetId)
  await syncCategoriesFromSheet(spreadsheetId)
  await migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  await migrateSubCategoryColumn(spreadsheetId).catch(() => undefined)
  await ensureMembershipDate(spreadsheetId).catch(() => '')
  markAllKnownSheetsPrepared(spreadsheetId)
  markSessionPrepared(spreadsheetId)

  return spreadsheetId
}

export async function activateSpreadsheet(
  spreadsheetId: string,
  previousId?: string,
  /** Name from Google Picker, for a sheet Drive's name filter or list does not show yet. */
  pickedName?: string
): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings()

    const options = await syncSpreadsheetsFromDrive()

    const entry =
      options.find(sheet => sheet.id === spreadsheetId) ??
      settings.spreadsheets?.find(sheet => sheet.id === spreadsheetId) ??
      (pickedName ? { name: pickedName } : undefined)

    if (!entry) {
      throw new Error('شیت انتخاب‌شده پیدا نشد')
    }
    if (!(await verifySpreadsheetExists(spreadsheetId))) {
      throw new Error(SPREADSHEET_NO_ACCESS_MESSAGE)
    }

    const prev = previousId ?? settings.spreadsheetId

    return finalizeSpreadsheetActivation(
      spreadsheetId,
      entry.name,
      prev !== spreadsheetId ? prev : undefined
    )
  })
}

export async function prepareUserSpreadsheet(_userName?: string | null): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const session = await resolveSpreadsheetSession()

    if (session.status === 'need_selection') {
      throw new Error('لطفاً یک شیت از Google Drive انتخاب کنید')
    }
    if (session.status === 'need_first_sheet') {
      throw new Error('ابتدا یک شیت جدید بسازید')
    }

    const settings = getSettings() ?? getDefaultSettings()

    const entry = settings.spreadsheets?.find(sheet => sheet.id === session.spreadsheetId)

    return finalizeSpreadsheetActivation(
      session.spreadsheetId,
      entry?.name ?? session.spreadsheetId,
      settings.spreadsheetId
    )
  })
}

export async function createNamedSpreadsheet(label: string): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings()

    const title = formatSpreadsheetTitle(label)

    const previousId = settings.spreadsheetId

    const spreadsheetId = await createSpreadsheet(title, settings.forms)

    return finalizeSpreadsheetActivation(spreadsheetId, title, previousId)
  })
}

export async function switchActiveSpreadsheet(spreadsheetId: string): Promise<string> {
  const settings = getSettings() ?? getDefaultSettings()

  if (settings.spreadsheetId === spreadsheetId) {
    return spreadsheetId
  }

  return activateSpreadsheet(spreadsheetId, settings.spreadsheetId)
}

export function getDefaultFirstSheetLabel(): string {
  return String(getJalaliParts(new Date()).year)
}

/** @deprecated Use createNamedSpreadsheet instead */
export async function recreateUserSpreadsheet(): Promise<string> {
  return createNamedSpreadsheet(getDefaultFirstSheetLabel())
}
