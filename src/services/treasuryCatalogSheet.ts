import { exportSheetCsv, importSheetCsv, newImportId } from './importExport'
import { TREASURY_ASSETS_HEADERS } from './sheetHeaders'
import { TREASURY_ASSETS_SHEET } from './sheetNames'
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  replaceSheetDataRows,
  updateSheetRow
} from './sheets'
import {
  getVaultCatalog,
  mergeVaultCatalog,
  missingBuiltinAssets,
  rowToVaultAsset,
  setVaultCatalog,
  vaultAssetToRow
} from './treasuryCatalog'
import { validateVaultAssetCsvCells } from './treasuryCatalogCsvValidate'
import type { VaultAsset } from '../types'

type SheetAsset = VaultAsset & { rowNumber: number }

async function fetchSheetAssets(spreadsheetId: string): Promise<SheetAsset[]> {
  const rows = await fetchSheetRows(spreadsheetId, TREASURY_ASSETS_SHEET)

  return rows.flatMap((row, index) => {
    const asset = rowToVaultAsset(row)

    return asset ? [{ ...asset, rowNumber: index + 2 }] : []
  })
}

function remember(sheetAssets: VaultAsset[]): VaultAsset[] {
  const catalog = mergeVaultCatalog(sheetAssets)

  setVaultCatalog(catalog)

  return catalog
}

/** Catalog for reading (dashboard, reports, exports); built-ins when the tab is unreadable. */
export async function loadVaultCatalog(spreadsheetId: string): Promise<VaultAsset[]> {
  try {
    return remember(await fetchSheetAssets(spreadsheetId))
  } catch {
    return getVaultCatalog()
  }
}

/** Creates the tab and writes the built-in rows it is missing (first run), then loads it. */
export async function seedVaultCatalog(spreadsheetId: string): Promise<VaultAsset[]> {
  await ensureSheetWithHeaders(spreadsheetId, TREASURY_ASSETS_SHEET, TREASURY_ASSETS_HEADERS)

  const sheetAssets = await fetchSheetAssets(spreadsheetId)
  const missing = missingBuiltinAssets(sheetAssets)

  if (!missing.length) return remember(sheetAssets)

  if (!sheetAssets.length) {
    await replaceSheetDataRows(
      spreadsheetId,
      TREASURY_ASSETS_SHEET,
      missing.map(vaultAssetToRow),
      TREASURY_ASSETS_HEADERS.length,
      TREASURY_ASSETS_HEADERS
    )
  } else {
    for (const asset of missing) {
      await appendSheetRow(spreadsheetId, TREASURY_ASSETS_SHEET, vaultAssetToRow(asset))
    }
  }

  return remember([...sheetAssets, ...missing])
}

/** Updates the asset's row, or appends it (a built-in not seeded yet, or a new asset). */
export async function saveVaultAsset(spreadsheetId: string, asset: VaultAsset): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TREASURY_ASSETS_SHEET, TREASURY_ASSETS_HEADERS)

  const sheetAssets = await fetchSheetAssets(spreadsheetId)
  const current = sheetAssets.find(item => item.id === asset.id)

  if (current) {
    await updateSheetRow(
      spreadsheetId,
      TREASURY_ASSETS_SHEET,
      current.rowNumber,
      vaultAssetToRow(asset)
    )
  } else {
    await appendSheetRow(spreadsheetId, TREASURY_ASSETS_SHEET, vaultAssetToRow(asset))
  }

  remember(
    current
      ? sheetAssets.map(item => (item.id === asset.id ? asset : item))
      : [...sheetAssets, asset]
  )
}

export async function exportVaultCatalogCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(
    spreadsheetId,
    TREASURY_ASSETS_SHEET,
    TREASURY_ASSETS_HEADERS,
    'دارایی-صندوقچه.csv'
  )
}

export async function importVaultCatalogCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    TREASURY_ASSETS_SHEET,
    TREASURY_ASSETS_HEADERS,
    csvContent,
    cells => {
      const valid = validateVaultAssetCsvCells(cells)

      const asset = rowToVaultAsset([newImportId(cells[0] ?? ''), ...valid.slice(1)])

      return asset ? vaultAssetToRow(asset) : null
    }
  )
}
