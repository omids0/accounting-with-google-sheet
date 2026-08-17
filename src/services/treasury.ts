import type { VaultAction, VaultAssetType, VaultHolding, VaultTransaction } from '../types';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow,
} from './sheets';
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport';

export const TREASURY_SHEET = 'صندوقچه';

export const TREASURY_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'نوع دارایی',
  'عملیات',
  'مقدار',
  'قیمت واحد',
  'تاریخ',
  'توضیحات',
];

function rowToTransaction(
  row: string[],
  rowNumber: number
): VaultTransaction & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    assetType: (row[2] ?? 'sekeb') as VaultAssetType,
    action: (row[3] ?? 'buy') as VaultAction,
    quantity: Number(row[4]) || 0,
    unitPrice: Number(row[5]) || 0,
    transactionDate: row[6] ?? '',
    note: row[7] ?? '',
  };
}

function transactionToRow(tx: VaultTransaction): string[] {
  return [
    tx.id,
    tx.createdAt,
    tx.assetType,
    tx.action,
    String(tx.quantity),
    String(tx.unitPrice),
    tx.transactionDate,
    tx.note,
  ];
}

export function netQuantity(
  transactions: VaultTransaction[],
  assetType: VaultAssetType
): number {
  return transactions
    .filter((tx) => tx.assetType === assetType)
    .reduce(
      (sum, tx) => sum + (tx.action === 'buy' ? tx.quantity : -tx.quantity),
      0
    );
}

export function computeHoldings(
  transactions: VaultTransaction[],
  prices: Record<VaultAssetType, number>
): VaultHolding[] {
  const byAsset = new Map<VaultAssetType, VaultTransaction[]>();

  for (const tx of transactions) {
    const list = byAsset.get(tx.assetType) ?? [];
    list.push(tx);
    byAsset.set(tx.assetType, list);
  }

  const holdings: VaultHolding[] = [];

  for (const [assetType, txs] of byAsset) {
    const qty = netQuantity(txs, assetType);
    if (qty <= 0) continue;

    const sorted = [...txs].sort((a, b) =>
      (b.transactionDate || '').localeCompare(a.transactionDate || '')
    );
    const unitPrice = prices[assetType] ?? 0;

    holdings.push({
      assetType,
      netQuantity: qty,
      currentUnitPrice: unitPrice,
      totalValue: qty * unitPrice,
      transactions: sorted,
    });
  }

  return holdings.sort((a, b) => a.assetType.localeCompare(b.assetType));
}

export async function ensureTreasurySheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TREASURY_SHEET, TREASURY_HEADERS);
}

export async function fetchVaultTransactions(
  spreadsheetId: string
): Promise<(VaultTransaction & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TREASURY_SHEET);
  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToTransaction(row, rowNumber))
    .sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''));
}

export async function createVaultTransaction(
  spreadsheetId: string,
  data: {
    assetType: VaultAssetType;
    action: VaultAction;
    quantity: number;
    unitPrice: number;
    transactionDate: string;
    note: string;
  }
): Promise<VaultTransaction> {
  const tx: VaultTransaction = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    assetType: data.assetType,
    action: data.action,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    transactionDate: data.transactionDate,
    note: data.note,
  };

  await appendSheetRow(spreadsheetId, TREASURY_SHEET, transactionToRow(tx));
  return tx;
}

export async function updateVaultTransaction(
  spreadsheetId: string,
  rowNumber: number,
  tx: VaultTransaction
): Promise<void> {
  await updateSheetRow(spreadsheetId, TREASURY_SHEET, rowNumber, transactionToRow(tx));
}

export async function deleteVaultTransaction(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, TREASURY_SHEET, rowNumber);
}

const VALID_ASSET_TYPES = new Set<VaultAssetType>([
  'sekeb',
  'sekee',
  'nim',
  'rob',
  'gerami',
  'geram18',
  'usd',
]);

const VALID_ACTIONS = new Set<VaultAction>(['buy', 'sell']);

export async function exportTreasuryCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, TREASURY_SHEET, TREASURY_HEADERS, 'صندوقچه.csv');
}

export async function importTreasuryCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    TREASURY_SHEET,
    TREASURY_HEADERS,
    csvContent,
    (cells) => {
      const assetType = (cells[2] ?? '').trim() as VaultAssetType;
      const action = (cells[3] ?? '').trim() as VaultAction;
      if (!VALID_ASSET_TYPES.has(assetType) || !VALID_ACTIONS.has(action)) {
        return null;
      }
      const quantity = Number(cells[4]);
      if (!quantity) return null;
      return transactionToRow({
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        assetType,
        action,
        quantity,
        unitPrice: Number(cells[5]) || 0,
        transactionDate: cells[6] ?? '',
        note: cells[7] ?? '',
      });
    }
  );
}
