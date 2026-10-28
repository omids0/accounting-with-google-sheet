import type { SpreadsheetEntry } from '../types'
import { getAllSheetSpecs } from './allSheetSpecs'
import { waitForSessionSync } from './sessionSync'
import { getDefaultSettings, getSettings, registerSpreadsheet } from './settings'
import {
  createSpreadsheet,
  ensureManySheetsWithHeaders,
  invalidateSpreadsheetCache,
  markSheetsPrepared,
  verifySpreadsheetExists
} from './sheets'
import { invalidateSheetTitlesCache, unmarkSheetsPrepared } from './sheetsMeta'
import {
  clearInaccessibleSpreadsheet,
  markSpreadsheetInaccessible,
  SpreadsheetNoAccessError
} from './spreadsheetAccess'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { syncSpreadsheetsFromDrive } from './spreadsheetDriveSync'
import {
  clearPreparedRecords,
  isPreparedRecently,
  markPreparedRecently,
  takeFreshlyCreated
} from './spreadsheetPreparedSession'
import { resolveWorkspaceType } from './workspace'
import { getJalaliParts } from '../utils/jalaliDate'

export { getAllSheetSpecs, syncSpreadsheetsFromDrive }

/** The longest the contents refresh waits for the first download before it just goes ahead. */
const REFRESH_WAIT_MS = 15_000

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

function markAllKnownSheetsPrepared(spreadsheetId: string): void {
  markSheetsPrepared(
    spreadsheetId,
    getAllSheetSpecs(spreadsheetId).map(sheet => sheet.sheetName)
  )
}

/** The signature changes whenever an app update adds a sheet or a column: a fresh check follows. */
function preparedSignature(spreadsheetId: string): string {
  const specs = getAllSheetSpecs(spreadsheetId).map(
    sheet => `${sheet.sheetName}:${sheet.headers.length}`
  )

  return `${spreadsheetId}|${specs.join(',')}`
}

function isSessionPrepared(spreadsheetId: string): boolean {
  return isPreparedRecently(spreadsheetId, preparedSignature(spreadsheetId))
}

function markSessionPrepared(spreadsheetId: string): void {
  markPreparedRecently(spreadsheetId, preparedSignature(spreadsheetId))
}

export function clearSpreadsheetPrepareSession(spreadsheetId?: string): void {
  clearPreparedRecords()
  if (spreadsheetId) {
    invalidateSpreadsheetCache(spreadsheetId)
  }
}

async function ensureAllSheets(spreadsheetId: string): Promise<void> {
  await ensureManySheetsWithHeaders(spreadsheetId, getAllSheetSpecs(spreadsheetId))
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

async function finalizeSpreadsheetActivation(spreadsheetId: string, name: string): Promise<string> {
  registerSpreadsheet(spreadsheetId, name)
  clearInaccessibleSpreadsheet()

  // A spreadsheet this app just created has every tab and header already. The records are kept
  // for each spreadsheet, so going back to one opened earlier does not check it all again.
  const fresh = takeFreshlyCreated(spreadsheetId)

  if (fresh || isSessionPrepared(spreadsheetId)) {
    markAllKnownSheetsPrepared(spreadsheetId)
    if (fresh) markSessionPrepared(spreadsheetId)
    // Headers are known good; categories may have changed on another device. The refresh waits
    // for the first download of the switch, so it reads the tabs that download just brought
    // instead of asking Google for them a second time.
    void waitForSessionSync(Date.now(), REFRESH_WAIT_MS)
      .then(() => import('./spreadsheetPrepare'))
      .then(prepare => prepare.refreshSpreadsheetContents(spreadsheetId))
      .catch(() => undefined)

    return spreadsheetId
  }

  await ensureAllSheets(spreadsheetId)
  // Loaded on demand: category and migration code is not needed to show cached data.
  const { prepareSpreadsheetContents } = await import('./spreadsheetPrepare')
  await prepareSpreadsheetContents(spreadsheetId)
  markAllKnownSheetsPrepared(spreadsheetId)
  markSessionPrepared(spreadsheetId)

  return spreadsheetId
}

export async function activateSpreadsheet(
  spreadsheetId: string,
  _previousId?: string,
  /** Name from Google Picker, for a sheet Drive's name filter or list does not show yet. */
  pickedName?: string
): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings()

    // A sheet this device already lists needs no Drive round trip to be opened.
    const listed = settings.spreadsheets?.find(sheet => sheet.id === spreadsheetId)

    const entry =
      listed ??
      (await syncSpreadsheetsFromDrive()).find(sheet => sheet.id === spreadsheetId) ??
      (pickedName ? { name: pickedName } : undefined)

    if (!entry) {
      throw new Error('شیت انتخاب‌شده پیدا نشد')
    }
    if (!(await verifySpreadsheetExists(spreadsheetId))) {
      throw new SpreadsheetNoAccessError()
    }

    // Known before the switch, so the first frame of the new sheet has its own menu and pages.
    await resolveWorkspaceType(spreadsheetId)

    return finalizeSpreadsheetActivation(spreadsheetId, entry.name)
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
      entry?.name ?? session.spreadsheetId
    )
  })
}

export async function createNamedSpreadsheet(label: string): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings()

    const title = formatSpreadsheetTitle(label)

    const spreadsheetId = await createSpreadsheet(title, settings.forms)

    return finalizeSpreadsheetActivation(spreadsheetId, title)
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

/**
 * Creates known tabs that turned out to be missing (a sync download did not return
 * them), e.g. a tab added by an app update on a spreadsheet already marked prepared.
 */
export async function repairMissingSheets(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<void> {
  const specs = getAllSheetSpecs(spreadsheetId).filter(spec => sheetNames.includes(spec.sheetName))

  if (!specs.length) return

  unmarkSheetsPrepared(
    spreadsheetId,
    specs.map(spec => spec.sheetName)
  )
  invalidateSheetTitlesCache(spreadsheetId)
  await ensureManySheetsWithHeaders(spreadsheetId, specs)
}
