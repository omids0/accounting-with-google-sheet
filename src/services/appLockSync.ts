import type { AppLockAccountConfig } from '../types';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
} from './sheets';

export const APP_LOCK_SHEET = 'قفل_اپ';
export const APP_LOCK_HEADERS = ['فعال', 'رمز_هش', 'نمک', 'زمان_بروزرسانی'];

function parseBool(value: string | undefined): boolean {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'بله' || v === 'yes';
}

function rowToAccountConfig(row: string[]): AppLockAccountConfig | null {
  const pinHash = String(row[1] ?? '').trim();
  const pinSalt = String(row[2] ?? '').trim();
  if (!pinHash || !pinSalt) return null;
  return {
    enabled: parseBool(row[0]),
    pinHash,
    pinSalt,
    updatedAt: String(row[3] ?? '').trim() || undefined,
  };
}

function accountConfigToRow(config: AppLockAccountConfig): string[] {
  return [
    config.enabled ? 'TRUE' : 'FALSE',
    config.pinHash,
    config.pinSalt,
    config.updatedAt ?? new Date().toISOString(),
  ];
}

export async function ensureAppLockSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, APP_LOCK_SHEET, APP_LOCK_HEADERS);
}

export async function fetchAppLockFromSheet(
  spreadsheetId: string
): Promise<AppLockAccountConfig | null> {
  await ensureAppLockSheet(spreadsheetId);
  const rows = await fetchSheetRows(spreadsheetId, APP_LOCK_SHEET);
  if (!rows.length) return null;
  return rowToAccountConfig(rows[0]);
}

export async function saveAppLockToSheet(
  spreadsheetId: string,
  config: AppLockAccountConfig
): Promise<void> {
  await ensureAppLockSheet(spreadsheetId);
  const rows = await fetchSheetRows(spreadsheetId, APP_LOCK_SHEET);
  const row = accountConfigToRow({
    ...config,
    updatedAt: new Date().toISOString(),
  });

  if (rows.length) {
    await updateSheetRow(spreadsheetId, APP_LOCK_SHEET, 2, row);
  } else {
    await appendSheetRow(spreadsheetId, APP_LOCK_SHEET, row);
  }
}

export async function clearAppLockFromSheet(spreadsheetId: string): Promise<void> {
  await ensureAppLockSheet(spreadsheetId);
  const rows = await fetchSheetRows(spreadsheetId, APP_LOCK_SHEET);
  if (!rows.length) return;

  await updateSheetRow(spreadsheetId, APP_LOCK_SHEET, 2, [
    'FALSE',
    '',
    '',
    new Date().toISOString(),
  ]);
}
