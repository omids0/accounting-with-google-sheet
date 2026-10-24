import type { VaultAction, VaultAssetType, VaultTransaction } from '../types'
import { importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { TREASURY_HEADERS } from './sheetHeaders'
import { TREASURY_SHEET } from './sheetNames'
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow
} from './sheets'
import { getAssetClassLabel, normalizeAssetId, resolveVaultAsset } from './treasuryCatalog'
import { loadVaultCatalog } from './treasuryCatalogSheet'
import { validateTreasuryCsvCells } from './treasuryCsvValidate'
import { transactionPnl } from './treasuryPnl'
import { formatQuantityValue } from './treasuryQuantity'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatMoney } from '../utils/formatMoney'
import { parseNumeric } from '../utils/parseNumeric'
import { downloadTablePdf } from '../utils/pdf'
import { formatPersianDate, formatVaultAction } from '../utils/pdfFormat'

export { TREASURY_SHEET, TREASURY_HEADERS }

function rowToTransaction(
  row: string[],
  rowNumber: number
): VaultTransaction & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    assetType: normalizeAssetId(row[2]) || 'sekeb',
    action: (row[3] ?? 'buy') as VaultAction,
    quantity: parseNumeric(row[4]),
    unitPrice: parseNumeric(row[5]),
    transactionDate: row[6] ?? '',
    note: row[7] ?? ''
  }
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
    tx.note
  ]
}

export async function ensureTreasurySheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TREASURY_SHEET, TREASURY_HEADERS)
}

export async function fetchVaultTransactions(
  spreadsheetId: string
): Promise<(VaultTransaction & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TREASURY_SHEET)

  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToTransaction(row, rowNumber))
    .sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''))
}

export async function createVaultTransaction(
  spreadsheetId: string,
  data: {
    assetType: VaultAssetType
    action: VaultAction
    quantity: number
    unitPrice: number
    transactionDate: string
    note: string
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
    note: data.note
  }

  await appendSheetRow(spreadsheetId, TREASURY_SHEET, transactionToRow(tx))

  return tx
}

export async function updateVaultTransaction(
  spreadsheetId: string,
  rowNumber: number,
  tx: VaultTransaction
): Promise<void> {
  await updateSheetRow(spreadsheetId, TREASURY_SHEET, rowNumber, transactionToRow(tx))
}

export async function deleteVaultTransaction(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, TREASURY_SHEET, rowNumber)
}

const EXPORT_ASSET_HEADERS = ['کلاس', 'نماد', 'واحد']

const EXPORT_PNL_HEADERS = ['خرید میانگین', 'سود قطعی']

type TransactionPnl = ReturnType<typeof transactionPnl>

/** Average cost after the row, and the gain of a sell (empty for a buy). */
function pnlColumns(pnl: TransactionPnl, id: string): [string, string] {
  const step = pnl.get(id)

  return [
    step ? formatMoney(step.avgUnitCost) : '',
    step?.gain != null ? formatMoney(step.gain) : ''
  ]
}

/** Asset class, symbol and unit for an export row (the sheet itself stores only the id). */
function assetColumns(assetType: string): [string, string, string] {
  const asset = resolveVaultAsset(assetType)

  return [getAssetClassLabel(asset.assetClass), asset.symbol, asset.unit]
}

/** The sheet's columns plus class, symbol and unit; import reads the first eight. */
export async function exportTreasuryCsv(spreadsheetId: string): Promise<string | null> {
  await loadVaultCatalog(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, TREASURY_SHEET)
  const pnl = transactionPnl(rows.map((row, index) => rowToTransaction(row, index + 2)))

  return downloadTextFile(
    'صندوقچه.csv',
    rowsToCsv(
      [...TREASURY_HEADERS, ...EXPORT_ASSET_HEADERS, ...EXPORT_PNL_HEADERS],
      rows.map(row => [
        ...TREASURY_HEADERS.map((_, index) => row[index] ?? ''),
        ...assetColumns(normalizeAssetId(row[2])),
        ...pnlColumns(pnl, row[0] ?? '')
      ])
    )
  )
}

export async function exportTreasuryPdf(spreadsheetId: string): Promise<string | null> {
  await loadVaultCatalog(spreadsheetId)

  const transactions = await fetchVaultTransactions(spreadsheetId)

  const headers = [
    'دارایی',
    ...EXPORT_ASSET_HEADERS,
    'عملیات',
    'مقدار',
    'قیمت واحد',
    'جمع',
    'تاریخ',
    'توضیحات',
    ...EXPORT_PNL_HEADERS
  ]
  const pnl = transactionPnl(transactions)

  const rows = transactions.map(tx => {
    const asset = resolveVaultAsset(tx.assetType)

    return [
      asset.name,
      ...assetColumns(tx.assetType),
      formatVaultAction(tx.action),
      formatQuantityValue(tx.quantity, asset.decimals),
      formatMoney(tx.unitPrice),
      formatMoney(tx.quantity * tx.unitPrice),
      formatPersianDate(tx.transactionDate),
      tx.note,
      ...pnlColumns(pnl, tx.id)
    ]
  })

  const cellClasses = transactions.map(() => [
    '',
    '',
    '',
    '',
    '',
    '',
    'pdf-cell-amount',
    'pdf-cell-amount',
    '',
    '',
    'pdf-cell-amount',
    'pdf-cell-amount'
  ])

  return downloadTablePdf({
    title: 'گزارش صندوقچه',
    headers,
    rows,
    filename: 'صندوقچه.pdf',
    cellClasses
  })
}

/** Rows must name an asset of the catalog (by id, or a legacy id or name). */
export async function importTreasuryCsv(spreadsheetId: string, csvContent: string) {
  const knownIds = new Set((await loadVaultCatalog(spreadsheetId)).map(asset => asset.id))

  return importSheetCsv(spreadsheetId, TREASURY_SHEET, TREASURY_HEADERS, csvContent, cells => {
    const { assetType, action, quantity, unitPrice, transactionDate } = validateTreasuryCsvCells(
      cells,
      knownIds
    )

    return transactionToRow({
      id: newImportId(cells[0] ?? ''),
      createdAt: newImportTimestamp(cells[1] ?? ''),
      assetType,
      action,
      quantity,
      unitPrice,
      transactionDate,
      note: cells[7] ?? ''
    })
  })
}
