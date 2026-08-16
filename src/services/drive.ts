import { getAccessToken } from './auth';
import { isAccountingSpreadsheetTitle } from './spreadsheetCatalog';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
}

async function driveRequest<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        `خطای Drive API: ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export async function listAccountingSpreadsheetsFromDrive(): Promise<
  DriveSpreadsheetFile[]
> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains 'حسابداری'"
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime),nextPageToken');

  const results: DriveSpreadsheetFile[] = [];
  let pageToken: string | undefined;

  do {
    const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const data = await driveRequest<{
      files?: DriveSpreadsheetFile[];
      nextPageToken?: string;
    }>(
      `${DRIVE_API}?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=100${page}`
    );

    for (const file of data.files ?? []) {
      if (isAccountingSpreadsheetTitle(file.name)) {
        results.push(file);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return results.sort(
    (a, b) =>
      new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
  );
}
