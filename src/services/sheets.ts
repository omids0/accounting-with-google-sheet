import type { CustomForm, FieldConfig } from '../types';
import { getAccessToken } from './auth';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

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
  const meta = await apiRequest<{
    sheets?: { properties?: { title?: string } }[];
  }>(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`);

  const exists = meta.sheets?.some(
    (s) => s.properties?.title === form.sheetName
  );
  if (!exists) {
    await addSheetTab(spreadsheetId, form.sheetName);
  }
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
