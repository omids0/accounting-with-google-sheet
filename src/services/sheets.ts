import { sortFormFields } from '../components/form/fieldUtils';
import type { CustomForm, FieldConfig } from '../types';
import {
  cellToString,
  isSheetHeaderRow,
  normalizeSheetDate,
} from '../utils/sheetValues';
import { getAccessToken } from './auth';
import { recordOperation } from './activityTracking';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TITLES_CACHE_TTL_MS = 120_000;

const ensureSheetLocks = new Map<string, Promise<void>>();
const ensureManyLocks = new Map<string, Promise<void>>();
let createSpreadsheetLock: Promise<string> | null = null;
const sheetTitlesCache = new Map<string, { titles: string[]; expiresAt: number }>();
const preparedSheets = new Map<string, Set<string>>();

export interface SheetSpec {
  sheetName: string;
  headers: string[];
}

function normalizeSheetTitle(title: string): string {
  return title.normalize('NFC').trim();
}

function sheetLockKey(spreadsheetId: string, sheetName: string): string {
  return `${spreadsheetId}:${normalizeSheetTitle(sheetName)}`;
}

export function isSpreadsheetNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|requested entity was not found/i.test(msg);
}

export function isQuotaExceededError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /quota exceeded|rate limit|too many requests/i.test(msg);
}

export function invalidateSpreadsheetCache(spreadsheetId: string): void {
  sheetTitlesCache.delete(spreadsheetId);
  preparedSheets.delete(spreadsheetId);
}

export function markSheetsPrepared(
  spreadsheetId: string,
  sheetNames: string[]
): void {
  let set = preparedSheets.get(spreadsheetId);
  if (!set) {
    set = new Set();
    preparedSheets.set(spreadsheetId, set);
  }
  for (const name of sheetNames) {
    set.add(normalizeSheetTitle(name));
  }
}

function isSheetPrepared(spreadsheetId: string, sheetName: string): boolean {
  return (
    preparedSheets.get(spreadsheetId)?.has(normalizeSheetTitle(sheetName)) ??
    false
  );
}

function invalidateSheetTitlesCache(spreadsheetId: string): void {
  sheetTitlesCache.delete(spreadsheetId);
}

async function fetchSheetTitlesFromApi(spreadsheetId: string): Promise<string[]> {
  const meta = await apiRequest<{
    sheets?: { properties?: { title?: string } }[];
  }>(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`);

  return (meta.sheets ?? [])
    .map((s) => s.properties?.title ?? '')
    .filter(Boolean);
}

async function getSheetTitles(
  spreadsheetId: string,
  forceRefresh = false
): Promise<string[]> {
  const cached = sheetTitlesCache.get(spreadsheetId);
  if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
    return cached.titles;
  }

  const titles = await fetchSheetTitlesFromApi(spreadsheetId);
  sheetTitlesCache.set(spreadsheetId, {
    titles,
    expiresAt: Date.now() + TITLES_CACHE_TTL_MS,
  });
  return titles;
}

function sheetExistsInTitles(titles: string[], sheetName: string): boolean {
  const target = normalizeSheetTitle(sheetName);
  return titles.some((title) => normalizeSheetTitle(title) === target);
}

export async function verifySpreadsheetExists(
  spreadsheetId: string
): Promise<boolean> {
  if (!spreadsheetId) return false;

  try {
    await getSheetTitles(spreadsheetId);
    return true;
  } catch (err) {
    if (isSpreadsheetNotFoundError(err)) return false;
    throw err;
  }
}

export async function ensureSpreadsheet(
  spreadsheetId: string,
  title: string,
  forms: CustomForm[]
): Promise<string> {
  if (spreadsheetId && (await verifySpreadsheetExists(spreadsheetId))) {
    return spreadsheetId;
  }

  invalidateSpreadsheetCache(spreadsheetId);
  return createSpreadsheet(title, forms);
}

async function batchAddSheetTabs(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<void> {
  if (!sheetNames.length) return;

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: sheetNames.map((name) => ({
        addSheet: { properties: { title: name } },
      })),
    }),
  });
  invalidateSheetTitlesCache(spreadsheetId);
}

function parseSheetNameFromRange(range: string): string {
  const bang = range.indexOf('!');
  const raw = bang >= 0 ? range.slice(0, bang) : range;
  return raw.replace(/^'/, '').replace(/'$/, '');
}

async function batchGetHeaderRows(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[]>> {
  if (!sheetNames.length) return new Map();

  const params = sheetNames
    .map((name) => `ranges=${encodeURIComponent(`${name}!1:1`)}`)
    .join('&');
  const data = await apiRequest<{
    valueRanges?: { range?: string; values?: string[][] }[];
  }>(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${params}`);

  const result = new Map<string, string[]>();
  for (const valueRange of data.valueRanges ?? []) {
    if (!valueRange.range) continue;
    const sheetName = parseSheetNameFromRange(valueRange.range);
    result.set(normalizeSheetTitle(sheetName), valueRange.values?.[0] ?? []);
  }
  return result;
}

async function writeSheetHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const endCol = String.fromCharCode(64 + headers.length);
  const range = encodeURIComponent(`${sheetName}!A1:${endCol}1`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [headers] }),
    }
  );
}

export async function ensureManySheetsWithHeaders(
  spreadsheetId: string,
  sheets: SheetSpec[]
): Promise<void> {
  const pendingLock = ensureManyLocks.get(spreadsheetId);
  if (pendingLock) {
    await pendingLock;
    return;
  }

  const task = ensureManySheetsWithHeadersInner(spreadsheetId, sheets);
  ensureManyLocks.set(spreadsheetId, task);
  try {
    await task;
  } finally {
    ensureManyLocks.delete(spreadsheetId);
  }
}

async function ensureManySheetsWithHeadersInner(
  spreadsheetId: string,
  sheets: SheetSpec[]
): Promise<void> {
  const pending = sheets.filter(
    (sheet) => !isSheetPrepared(spreadsheetId, sheet.sheetName)
  );
  if (!pending.length) return;

  let titles = await getSheetTitles(spreadsheetId);
  const missingTabs = pending.filter(
    (sheet) => !sheetExistsInTitles(titles, sheet.sheetName)
  );

  if (missingTabs.length) {
    await batchAddSheetTabs(
      spreadsheetId,
      missingTabs.map((sheet) => sheet.sheetName)
    );
    titles = await getSheetTitles(spreadsheetId, true);
  }

  const headerRows = await batchGetHeaderRows(
    spreadsheetId,
    pending.map((sheet) => sheet.sheetName)
  );

  for (const sheet of pending) {
    const existing =
      headerRows.get(normalizeSheetTitle(sheet.sheetName)) ?? [];
    const hasHeaders = existing.some((cell) => String(cell ?? '').trim());
    if (!hasHeaders) {
      await writeSheetHeaders(spreadsheetId, sheet.sheetName, sheet.headers);
    }
    markSheetsPrepared(spreadsheetId, [sheet.sheetName]);
  }
}

function token(): string {
  return getAccessToken();
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      (err as { error?: { message?: string } }).error?.message ||
      `خطای API: ${res.status}`;
    if (isQuotaExceededError(message)) {
      throw new Error(
        'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.'
      );
    }
    throw new Error(message);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function normalizeHeaderLabel(label: string): string {
  return label.normalize('NFC').trim();
}

function buildHeaders(fields: FieldConfig[]): string[] {
  return ['شناسه', 'زمان ثبت', ...sortFormFields(fields).map((f) => f.label)];
}

function buildFieldColumnMap(
  headers: string[],
  fields: FieldConfig[]
): Map<string, number> {
  const normalizedHeaders = headers.map(normalizeHeaderLabel);
  const map = new Map<string, number>();

  fields.forEach((field, index) => {
    const label = normalizeHeaderLabel(field.label);
    const byLabel = normalizedHeaders.findIndex((header) => header === label);
    map.set(field.id, byLabel >= 0 ? byLabel : index + 2);
  });

  return map;
}

async function getSheetHeaderRow(
  spreadsheetId: string,
  sheetName: string
): Promise<string[]> {
  const headerRows = await batchGetHeaderRows(spreadsheetId, [sheetName]);
  return headerRows.get(normalizeSheetTitle(sheetName)) ?? [];
}

function buildRecordRow(
  headers: string[],
  form: CustomForm,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): string[] {
  const columnMap = buildFieldColumnMap(headers, form.fields);
  const width = Math.max(headers.length, 2 + form.fields.length);
  const row = Array.from({ length: width }, () => '');

  row[0] = recordId;
  row[1] = createdAt;

  for (const field of form.fields) {
    const column = columnMap.get(field.id);
    if (column == null) continue;
    const val = values[field.id];
    row[column] = val !== undefined && val !== null ? String(val) : '';
  }

  return row;
}

function mapRowToValues(
  row: unknown[],
  fields: FieldConfig[],
  columnMap: Map<string, number>
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const column = columnMap.get(field.id);
    const raw = column == null ? '' : row[column];
    values[field.id] =
      field.type === 'date' ? normalizeSheetDate(raw) : cellToString(raw);
  }
  return values;
}

export async function createSpreadsheet(
  title: string,
  forms: CustomForm[]
): Promise<string> {
  if (createSpreadsheetLock) {
    return createSpreadsheetLock;
  }

  createSpreadsheetLock = createSpreadsheetInner(title, forms).finally(() => {
    createSpreadsheetLock = null;
  });
  return createSpreadsheetLock;
}

async function createSpreadsheetInner(
  title: string,
  forms: CustomForm[]
): Promise<string> {
  const data = await apiRequest<{ spreadsheetId: string }>(SHEETS_API, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: forms.map((form) => ({
        properties: {
          title: form.sheetName,
          gridProperties: { frozenRowCount: 1 },
        },
      })),
    }),
  });

  for (const form of forms) {
    await writeHeaders(data.spreadsheetId, form);
  }

  markSheetsPrepared(
    data.spreadsheetId,
    forms.map((form) => form.sheetName)
  );
  sheetTitlesCache.set(data.spreadsheetId, {
    titles: forms.map((form) => form.sheetName),
    expiresAt: Date.now() + TITLES_CACHE_TTL_MS,
  });

  return data.spreadsheetId;
}

export async function addSheetTab(
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  await batchAddSheetTabs(spreadsheetId, [sheetName]);
}

async function writeHeaders(
  spreadsheetId: string,
  form: CustomForm
): Promise<void> {
  const headers = buildHeaders(form.fields);
  await writeSheetHeaders(spreadsheetId, form.sheetName, headers);
}

export async function ensureFormSheet(
  spreadsheetId: string,
  form: CustomForm
): Promise<void> {
  await ensureManySheetsWithHeaders(spreadsheetId, [
    { sheetName: form.sheetName, headers: buildHeaders(form.fields) },
  ]);
}

export async function appendRecord(
  spreadsheetId: string,
  form: CustomForm,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): Promise<void> {
  const headers = await getSheetHeaderRow(spreadsheetId, form.sheetName);
  const row = buildRecordRow(headers, form, recordId, createdAt, values);
  const range = encodeURIComponent(`${form.sheetName}!A:Z`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    }
  );
  recordOperation();
}

export type SheetRecord = {
  id: string;
  createdAt: string;
  rowNumber: number;
  values: Record<string, string>;
};

export async function fetchRecords(
  spreadsheetId: string,
  form: CustomForm
): Promise<SheetRecord[]> {
  const range = encodeURIComponent(`${form.sheetName}!A1:Z2000`);
  const data = await apiRequest<{ values?: unknown[][] }>(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  );
  const rows = data.values ?? [];
  if (!rows.length) return [];

  const hasHeader = isSheetHeaderRow(rows[0]);
  const headers = hasHeader
    ? rows[0].map((cell) => cellToString(cell))
    : buildHeaders(form.fields);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const columnMap = buildFieldColumnMap(headers, form.fields);

  return dataRows
    .map((row, index) => ({ row, rowNumber: hasHeader ? index + 2 : index + 1 }))
    .filter(({ row }) => cellToString(row[0]).trim())
    .map(({ row, rowNumber }) => ({
      id: cellToString(row[0]),
      createdAt: cellToString(row[1]),
      rowNumber,
      values: mapRowToValues(row, form.fields, columnMap),
    }));
}

export async function updateRecord(
  spreadsheetId: string,
  form: CustomForm,
  rowNumber: number,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): Promise<void> {
  const headers = await getSheetHeaderRow(spreadsheetId, form.sheetName);
  const row = buildRecordRow(headers, form, recordId, createdAt, values);
  await updateSheetRow(spreadsheetId, form.sheetName, rowNumber, row);
}

export function getSpreadsheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}

export async function ensureSheetWithHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const lockKey = sheetLockKey(spreadsheetId, sheetName);
  const pending = ensureSheetLocks.get(lockKey);
  if (pending) return pending;

  const task = ensureManySheetsWithHeaders(spreadsheetId, [
    { sheetName, headers },
  ]);

  ensureSheetLocks.set(lockKey, task);
  try {
    await task;
  } finally {
    ensureSheetLocks.delete(lockKey);
  }
}

export async function fetchSheetRows(
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const range = encodeURIComponent(`${sheetName}!A2:Z2000`);
  const data = await apiRequest<{ values?: string[][] }>(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  );
  return data.values ?? [];
}

export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  row: string[]
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:Z`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    }
  );
  recordOperation();
}

export async function updateSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  row: string[]
): Promise<void> {
  const endCol = String.fromCharCode(64 + Math.max(row.length, 1));
  const range = encodeURIComponent(`${sheetName}!A${rowNumber}:${endCol}${rowNumber}`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [row] }),
    }
  );
  recordOperation();
}

async function getSheetId(
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const meta = await apiRequest<{
    sheets?: { properties?: { title?: string; sheetId?: number } }[];
  }>(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties(title,sheetId)`);

  const target = normalizeSheetTitle(sheetName);
  const sheet = (meta.sheets ?? []).find(
    (item) => normalizeSheetTitle(item.properties?.title ?? '') === target
  );
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`شیت «${sheetName}» یافت نشد`);
  }
  return sheetId;
}

export async function deleteSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<void> {
  const sheetId = await getSheetId(spreadsheetId, sheetName);
  const startIndex = rowNumber - 1;

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    }),
  });
}

export async function deleteRecord(
  spreadsheetId: string,
  form: CustomForm,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, form.sheetName, rowNumber);
}

export async function replaceSheetDataRows(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
  columnCount = 2
): Promise<void> {
  const endCol = String.fromCharCode(64 + Math.max(columnCount, 1));
  const clearRange = encodeURIComponent(`${sheetName}!A2:${endCol}1000`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${clearRange}:clear`,
    { method: 'POST' }
  );

  if (!rows.length) return;

  const writeRange = encodeURIComponent(
    `${sheetName}!A2:${endCol}${rows.length + 1}`
  );
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${writeRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );
}
