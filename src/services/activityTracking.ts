import { getSettings } from './settings';
import { getItem, setItem } from './storage';
import {
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  appendSheetRow,
} from './sheets';
import { getTodayIso } from '../utils/jalaliDate';

export const ACTIVITY_SHEET = 'فعالیت';
export const ACTIVITY_HEADERS = ['آخرین_بازدید', 'آخرین_عملیات'];

const ACTIVITY_KEY = 'accounting_activity';

interface ActivityState {
  lastOpenDate?: string;
  lastOperationDate?: string;
}

function getState(): ActivityState {
  return getItem<ActivityState>(ACTIVITY_KEY) ?? {};
}

function saveState(state: ActivityState): void {
  setItem(ACTIVITY_KEY, state);
}

async function ensureActivitySheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, ACTIVITY_SHEET, ACTIVITY_HEADERS);
}

async function upsertActivityRow(
  spreadsheetId: string,
  lastOpenDate: string,
  lastOperationDate: string
): Promise<void> {
  await ensureActivitySheet(spreadsheetId);
  const rows = await fetchSheetRows(spreadsheetId, ACTIVITY_SHEET);
  const row = [lastOpenDate, lastOperationDate];

  if (rows.length > 0) {
    await updateSheetRow(spreadsheetId, ACTIVITY_SHEET, 2, row);
    return;
  }

  await appendSheetRow(spreadsheetId, ACTIVITY_SHEET, row);
}

export async function syncAppOpen(spreadsheetId: string): Promise<void> {
  const today = getTodayIso();
  const state = getState();
  const next: ActivityState = { ...state, lastOpenDate: today };
  saveState(next);

  await upsertActivityRow(
    spreadsheetId,
    today,
    next.lastOperationDate ?? ''
  );
}

export async function syncOperation(
  spreadsheetId: string,
  date: string = getTodayIso()
): Promise<void> {
  const state = getState();
  const next: ActivityState = {
    lastOpenDate: state.lastOpenDate ?? date,
    lastOperationDate: date,
  };
  saveState(next);

  await upsertActivityRow(
    spreadsheetId,
    next.lastOpenDate ?? date,
    date
  );
}

const SYNC_DEBOUNCE_MS = 3_000;
let syncDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSyncDate: string | undefined;

export function recordOperation(date: string = getTodayIso()): void {
  const state = getState();
  saveState({ ...state, lastOperationDate: date });

  const spreadsheetId = getSettings()?.spreadsheetId;
  if (!spreadsheetId) return;

  pendingSyncDate = date;
  if (syncDebounceTimer !== undefined) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    const syncDate = pendingSyncDate ?? date;
    pendingSyncDate = undefined;
    syncDebounceTimer = undefined;
    void syncOperation(spreadsheetId, syncDate);
  }, SYNC_DEBOUNCE_MS);
}
