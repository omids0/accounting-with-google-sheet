import type { AppSettings, FieldConfig } from '../types';
import { getAccessToken } from './auth';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function getToken(): string {
  return getAccessToken();
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
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
  return res.json() as Promise<T>;
}

export async function createSpreadsheet(
  title: string,
  fields: FieldConfig[]
): Promise<string> {
  const headers = ['شناسه', 'زمان ثبت', ...fields.map((f) => f.label)];
  const data = await apiRequest<{ spreadsheetId: string }>(SHEETS_API, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title, locale: 'fa_IR' },
      sheets: [
        {
          properties: {
            title: 'حسابداری',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  const sheetId = data.spreadsheetId;
  const range = encodeURIComponent('حسابداری!A1:Z1');
  await apiRequest(
    `${SHEETS_API}/${sheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [headers] }),
    }
  );

  return sheetId;
}

export async function validateSpreadsheet(
  sheetId: string,
  sheetName: string
): Promise<boolean> {
  await apiRequest(`${SHEETS_API}/${sheetId}?fields=sheets.properties.title`);
  const range = encodeURIComponent(`${sheetName}!A1:Z1`);
  await apiRequest(`${SHEETS_API}/${sheetId}/values/${range}`);
  return true;
}

export async function ensureHeaders(
  settings: AppSettings
): Promise<void> {
  const { sheetId, sheetName, fields } = settings;
  const range = encodeURIComponent(`${sheetName}!A1:Z1`);
  const headers = ['شناسه', 'زمان ثبت', ...fields.map((f) => f.label)];

  const existing = await apiRequest<{ values?: string[][] }>(
    `${SHEETS_API}/${sheetId}/values/${range}`
  );

  if (!existing.values?.length) {
    await apiRequest(
      `${SHEETS_API}/${sheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [headers] }),
      }
    );
  }
}

export async function appendRecord(
  settings: AppSettings,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): Promise<void> {
  const { sheetId, sheetName, fields } = settings;
  const row = [
    recordId,
    createdAt,
    ...fields.map((f) => {
      const val = values[f.id];
      return val !== undefined && val !== null ? String(val) : '';
    }),
  ];
  const range = encodeURIComponent(`${sheetName}!A:Z`);
  await apiRequest(
    `${SHEETS_API}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    }
  );
}

export async function fetchRecords(
  settings: AppSettings
): Promise<{ id: string; createdAt: string; values: Record<string, string> }[]> {
  const { sheetId, sheetName, fields } = settings;
  const range = encodeURIComponent(`${sheetName}!A2:Z1000`);
  const data = await apiRequest<{ values?: string[][] }>(
    `${SHEETS_API}/${sheetId}/values/${range}`
  );
  if (!data.values?.length) return [];

  return data.values.map((row) => {
    const values: Record<string, string> = {};
    fields.forEach((f, i) => {
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
