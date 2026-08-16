import type { SpreadsheetEntry } from '../types';
import { getUserName } from './auth';
import { listAccountingSpreadsheetsFromDrive } from './drive';
import {
  INSTALLMENTS_HEADERS,
  INSTALLMENTS_SHEET,
} from './installments';
import {
  MONTHLY_BALANCE_HEADERS,
  MONTHLY_BALANCE_SHEET,
} from './monthlyBalance';
import {
  RECEIVABLES_HEADERS,
  RECEIVABLES_SHEET,
} from './receivables';
import {
  formatSpreadsheetTitle,
  getSpreadsheetLabel,
} from './spreadsheetCatalog';
import {
  createSpreadsheet,
  ensureManySheetsWithHeaders,
  invalidateSpreadsheetCache,
  markSheetsPrepared,
  verifySpreadsheetExists,
  type SheetSpec,
} from './sheets';
import {
  TREASURY_HEADERS,
  TREASURY_SHEET,
} from './treasury';
import {
  WALLET_HEADERS,
  WALLET_SHEET,
} from './wallet';
import {
  getDefaultSettings,
  getSettings,
  registerSpreadsheet,
  saveSettings,
} from './settings';

const SESSION_PREPARED_KEY = 'accounting_sheets_ready';

let activeSpreadsheetSetup: Promise<string> | null = null;

export type SpreadsheetSessionStatus =
  | { status: 'ready'; spreadsheetId: string }
  | { status: 'need_selection'; options: SpreadsheetEntry[] }
  | { status: 'need_first_sheet' };

function runExclusiveSpreadsheetSetup(
  task: () => Promise<string>
): Promise<string> {
  if (activeSpreadsheetSetup) {
    return activeSpreadsheetSetup;
  }

  activeSpreadsheetSetup = task().finally(() => {
    activeSpreadsheetSetup = null;
  });
  return activeSpreadsheetSetup;
}

function buildHeaders(form: { fields: { label: string }[] }): string[] {
  return ['شناسه', 'زمان ثبت', ...form.fields.map((field) => field.label)];
}

function getAllSheetSpecs(): SheetSpec[] {
  const settings = getSettings() ?? getDefaultSettings();
  const formSheets = settings.forms.map((form) => ({
    sheetName: form.sheetName,
    headers: buildHeaders(form),
  }));

  return [
    ...formSheets,
    { sheetName: INSTALLMENTS_SHEET, headers: INSTALLMENTS_HEADERS },
    { sheetName: RECEIVABLES_SHEET, headers: RECEIVABLES_HEADERS },
    { sheetName: TREASURY_SHEET, headers: TREASURY_HEADERS },
    { sheetName: WALLET_SHEET, headers: WALLET_HEADERS },
    {
      sheetName: MONTHLY_BALANCE_SHEET,
      headers: MONTHLY_BALANCE_HEADERS,
    },
  ];
}

function markAllKnownSheetsPrepared(spreadsheetId: string): void {
  markSheetsPrepared(
    spreadsheetId,
    getAllSheetSpecs().map((sheet) => sheet.sheetName)
  );
}

function isSessionPrepared(spreadsheetId: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_PREPARED_KEY) === spreadsheetId;
  } catch {
    return false;
  }
}

function markSessionPrepared(spreadsheetId: string): void {
  try {
    sessionStorage.setItem(SESSION_PREPARED_KEY, spreadsheetId);
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function clearSpreadsheetPrepareSession(spreadsheetId?: string): void {
  try {
    sessionStorage.removeItem(SESSION_PREPARED_KEY);
  } catch {
    // Ignore storage failures in private mode.
  }
  if (spreadsheetId) {
    invalidateSpreadsheetCache(spreadsheetId);
  }
}

async function ensureAllSheets(spreadsheetId: string): Promise<void> {
  await ensureManySheetsWithHeaders(spreadsheetId, getAllSheetSpecs());
}

function driveFileToEntry(file: {
  id: string;
  name: string;
  modifiedTime: string;
}): SpreadsheetEntry {
  return {
    id: file.id,
    name: file.name,
    createdAt: file.modifiedTime,
  };
}

export async function syncSpreadsheetsFromDrive(): Promise<SpreadsheetEntry[]> {
  const settings = getSettings() ?? getDefaultSettings();
  const fromDrive = await listAccountingSpreadsheetsFromDrive();
  const merged = new Map<string, SpreadsheetEntry>();

  for (const sheet of settings.spreadsheets ?? []) {
    merged.set(sheet.id, sheet);
  }
  for (const file of fromDrive) {
    merged.set(file.id, driveFileToEntry(file));
  }

  const spreadsheets = Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const activeId =
    settings.spreadsheetId &&
    spreadsheets.some((sheet) => sheet.id === settings.spreadsheetId)
      ? settings.spreadsheetId
      : settings.spreadsheetId;

  saveSettings({
    ...settings,
    spreadsheets,
    spreadsheetId: activeId,
  });

  return spreadsheets;
}

export async function resolveSpreadsheetSession(): Promise<SpreadsheetSessionStatus> {
  const settings = getSettings() ?? getDefaultSettings();

  if (
    settings.spreadsheetId &&
    (await verifySpreadsheetExists(settings.spreadsheetId))
  ) {
    return { status: 'ready', spreadsheetId: settings.spreadsheetId };
  }

  const options = await syncSpreadsheetsFromDrive();
  if (options.length > 0) {
    return { status: 'need_selection', options };
  }

  return { status: 'need_first_sheet' };
}

async function finalizeSpreadsheetActivation(
  spreadsheetId: string,
  name: string,
  previousId?: string
): Promise<string> {
  registerSpreadsheet(spreadsheetId, name);
  clearSpreadsheetPrepareSession(previousId);
  clearSpreadsheetPrepareSession(spreadsheetId);

  if (isSessionPrepared(spreadsheetId)) {
    markAllKnownSheetsPrepared(spreadsheetId);
    return spreadsheetId;
  }

  await ensureAllSheets(spreadsheetId);
  markAllKnownSheetsPrepared(spreadsheetId);
  markSessionPrepared(spreadsheetId);
  return spreadsheetId;
}

export async function activateSpreadsheet(
  spreadsheetId: string,
  previousId?: string
): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings();
    const options = await syncSpreadsheetsFromDrive();
    const entry =
      options.find((sheet) => sheet.id === spreadsheetId) ??
      settings.spreadsheets?.find((sheet) => sheet.id === spreadsheetId);

    if (!entry) {
      throw new Error('شیت انتخاب‌شده پیدا نشد');
    }
    if (!(await verifySpreadsheetExists(spreadsheetId))) {
      throw new Error('این شیت در Google Drive پیدا نشد');
    }

    const prev = previousId ?? settings.spreadsheetId;
    return finalizeSpreadsheetActivation(
      spreadsheetId,
      entry.name,
      prev !== spreadsheetId ? prev : undefined
    );
  });
}

export async function prepareUserSpreadsheet(
  _userName?: string | null
): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const session = await resolveSpreadsheetSession();

    if (session.status === 'need_selection') {
      throw new Error('لطفاً یک شیت از Google Drive انتخاب کنید');
    }
    if (session.status === 'need_first_sheet') {
      throw new Error('ابتدا یک شیت جدید بسازید');
    }

    const settings = getSettings() ?? getDefaultSettings();
    const entry = settings.spreadsheets?.find(
      (sheet) => sheet.id === session.spreadsheetId
    );

    return finalizeSpreadsheetActivation(
      session.spreadsheetId,
      entry?.name ?? session.spreadsheetId,
      settings.spreadsheetId
    );
  });
}

export async function createNamedSpreadsheet(label: string): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings();
    const title = formatSpreadsheetTitle(label);
    const previousId = settings.spreadsheetId;

    const spreadsheetId = await createSpreadsheet(title, settings.forms);
    return finalizeSpreadsheetActivation(spreadsheetId, title, previousId);
  });
}

export async function switchActiveSpreadsheet(
  spreadsheetId: string
): Promise<string> {
  const settings = getSettings() ?? getDefaultSettings();
  if (settings.spreadsheetId === spreadsheetId) {
    return spreadsheetId;
  }
  return activateSpreadsheet(spreadsheetId, settings.spreadsheetId);
}

export function getDefaultFirstSheetLabel(userName?: string | null): string {
  const name = userName ?? getUserName();
  return name ? getSpreadsheetLabel(formatSpreadsheetTitle(name)) : 'اصلی';
}

/** @deprecated Use createNamedSpreadsheet instead */
export async function recreateUserSpreadsheet(
  userName?: string | null
): Promise<string> {
  return createNamedSpreadsheet(getDefaultFirstSheetLabel(userName));
}
