import { getUserName } from './auth';
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
  createSpreadsheet,
  ensureManySheetsWithHeaders,
  ensureSpreadsheet,
  invalidateSpreadsheetCache,
  markSheetsPrepared,
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
  saveSettings,
} from './settings';

const SESSION_PREPARED_KEY = 'accounting_sheets_ready';

let activeSpreadsheetSetup: Promise<string> | null = null;

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

function spreadsheetTitle(name?: string | null): string {
  return `حسابداری ${name || 'شخصی'}`;
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

export async function prepareUserSpreadsheet(
  userName?: string | null
): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings();
    const title = spreadsheetTitle(userName ?? getUserName());
    const spreadsheetId = await ensureSpreadsheet(
      settings.spreadsheetId,
      title,
      settings.forms
    );

    if (spreadsheetId !== settings.spreadsheetId) {
      clearSpreadsheetPrepareSession(settings.spreadsheetId);
      saveSettings({ ...settings, spreadsheetId });
    }

    if (isSessionPrepared(spreadsheetId)) {
      markAllKnownSheetsPrepared(spreadsheetId);
      return spreadsheetId;
    }

    await ensureAllSheets(spreadsheetId);
    markAllKnownSheetsPrepared(spreadsheetId);
    markSessionPrepared(spreadsheetId);
    return spreadsheetId;
  });
}

export async function recreateUserSpreadsheet(
  userName?: string | null
): Promise<string> {
  return runExclusiveSpreadsheetSetup(async () => {
    const settings = getSettings() ?? getDefaultSettings();
    clearSpreadsheetPrepareSession(settings.spreadsheetId);

    const spreadsheetId = await createSpreadsheet(
      spreadsheetTitle(userName ?? getUserName()),
      settings.forms
    );

    saveSettings({ ...settings, spreadsheetId });
    await ensureAllSheets(spreadsheetId);
    markAllKnownSheetsPrepared(spreadsheetId);
    markSessionPrepared(spreadsheetId);
    return spreadsheetId;
  });
}
