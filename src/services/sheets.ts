import type { CustomForm, FieldConfig } from '../types';
import { getAccessToken } from './auth';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const ensureSheetLocks = new Map<string, Promise<void>>();

function normalizeSheetTitle(title: string): string {
  return title.normalize('NFC').trim();
}

function sheetLockKey(spreadsheetId: string, sheetName: string): string {
  return `${spreadsheetId}:${normalizeSheetTitle(sheetName)}`;
}

async function fetchSheetTitles(spreadsheetId: string): Promise<string[]> {
  const meta = await apiRequest<{
    sheets?: { properties?: { title?: string } }[];
  }>(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`);

  return (meta.sheets ?? [])
    .map((s) => s.properties?.title ?? '')
    .filter(Boolean);
}

async function sheetExists(spreadsheetId: string, sheetName: string): Promise<boolean> {
  const titles = await fetchSheetTitles(spreadsheetId);
  const target = normalizeSheetTitle(sheetName);
  return titles.some((title) => normalizeSheetTitle(title) === target);
}

async function safeAddSheetTab(spreadsheetId: string, sheetName: string): Promise<void> {
  if (await sheetExists(spreadsheetId, sheetName)) return;

  try {
    await addSheetTab(spreadsheetId, sheetName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) return;
    throw err;
  }
}

async function writeSheetHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const headerRange = encodeURIComponent(`${sheetName}!1:1`);
  const existing = await apiRequest<{ values?: string[][] }>(
    `${SHEETS_API}/${spreadsheetId}/values/${headerRange}`
  );
  const hasHeaders = existing.values?.[0]?.some((cell) => String(cell ?? '').trim());
  if (hasHeaders) return;

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
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        `خطای API: ${res.status}`
    );
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function buildHeaders(fields: FieldConfig[]): string[] {
  return ['شناسه', 'زمان ثبت', ...fields.map((f) => f.label)];
}

export async function createSpreadsheet(
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

  return data.spreadsheetId;
}

export async function addSheetTab(
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    }),
  });
}

async function writeHeaders(
  spreadsheetId: string,
  form: CustomForm
): Promise<void> {
  const headers = buildHeaders(form.fields);
  const range = encodeURIComponent(`${form.sheetName}!A1:Z1`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [headers] }),
    }
  );
}

export async function ensureFormSheet(
  spreadsheetId: string,
  form: CustomForm
): Promise<void> {
  await safeAddSheetTab(spreadsheetId, form.sheetName);
  await writeHeaders(spreadsheetId, form);
}

export async function appendRecord(
  spreadsheetId: string,
  form: CustomForm,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): Promise<void> {
  const row = [
    recordId,
    createdAt,
    ...form.fields.map((f) => {
      const val = values[f.id];
      return val !== undefined && val !== null ? String(val) : '';
    }),
  ];
  const range = encodeURIComponent(`${form.sheetName}!A:Z`);
  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    }
  );
}

export async function fetchRecords(
  spreadsheetId: string,
  form: CustomForm
): Promise<{ id: string; createdAt: string; values: Record<string, string> }[]> {
  const range = encodeURIComponent(`${form.sheetName}!A2:Z2000`);
  const data = await apiRequest<{ values?: string[][] }>(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  );
  if (!data.values?.length) return [];

  return data.values
    .filter((row) => String(row[0] ?? '').trim())
    .map((row) => {
      const values: Record<string, string> = {};
      form.fields.forEach((f, i) => {
        values[f.id] = row[i + 2] ?? '';
      });
      return {
        id: row[0] ?? '',
        createdAt: row[1] ?? '',
        values,
      };
    });
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

  const task = (async () => {
    await safeAddSheetTab(spreadsheetId, sheetName);
    await writeSheetHeaders(spreadsheetId, sheetName, headers);
  })();

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
}
