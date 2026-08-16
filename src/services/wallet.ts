import type { WalletAccount } from '../types';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
} from './sheets';

export const WALLET_SHEET = 'کیف پول';

export const WALLET_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'موجودی', 'توضیحات'];

function rowToAccount(
  row: string[],
  rowNumber: number
): WalletAccount & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    balance: Number(row[3]) || 0,
    note: row[4] ?? '',
  };
}

function accountToRow(account: WalletAccount): string[] {
  return [
    account.id,
    account.createdAt,
    account.title,
    String(account.balance),
    account.note,
  ];
}

export async function ensureWalletSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, WALLET_SHEET, WALLET_HEADERS);
}

export async function fetchWalletAccounts(
  spreadsheetId: string
): Promise<(WalletAccount & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, WALLET_SHEET);
  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToAccount(row, rowNumber))
    .sort((a, b) => a.title.localeCompare(b.title, 'fa'));
}

export async function createWalletAccount(
  spreadsheetId: string,
  data: { title: string; balance: number; note: string }
): Promise<WalletAccount> {
  const account: WalletAccount = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    balance: data.balance,
    note: data.note,
  };

  await appendSheetRow(spreadsheetId, WALLET_SHEET, accountToRow(account));
  return account;
}

export async function updateWalletAccount(
  spreadsheetId: string,
  account: WalletAccount & { rowNumber: number }
): Promise<WalletAccount> {
  await updateSheetRow(
    spreadsheetId,
    WALLET_SHEET,
    account.rowNumber,
    accountToRow(account)
  );
  return account;
}
