import { exportSheetCsv, importSheetCsv } from './importExport'
import { netWorthSnapshotToRow, rowToNetWorthSnapshot, type NetWorthSnapshot } from './netWorth'
import { NET_WORTH_HEADERS } from './sheetHeaders'
import { NET_WORTH_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'

type SheetSnapshot = NetWorthSnapshot & { rowNumber: number }

async function fetchSheetSnapshots(spreadsheetId: string): Promise<SheetSnapshot[]> {
  const rows = await fetchSheetRows(spreadsheetId, NET_WORTH_SHEET)

  return rows.flatMap((row, index) => {
    const snapshot = rowToNetWorthSnapshot(row)

    return snapshot ? [{ ...snapshot, rowNumber: index + 2 }] : []
  })
}

/** Every month of «دارایی ماهانه», oldest first; empty before the tab exists. */
export async function fetchNetWorthSnapshots(spreadsheetId: string): Promise<NetWorthSnapshot[]> {
  try {
    return (await fetchSheetSnapshots(spreadsheetId))
      .map(({ rowNumber: _, ...snapshot }) => snapshot)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  } catch {
    return []
  }
}

export function netWorthTimestamp(): string {
  return new Date().toLocaleString('fa-IR')
}

/** Appends new months (auto or rebuilt) with one data-change notice at the end. */
export async function appendNetWorthSnapshots(
  spreadsheetId: string,
  snapshots: NetWorthSnapshot[]
): Promise<void> {
  if (!snapshots.length) return

  await ensureSheetWithHeaders(spreadsheetId, NET_WORTH_SHEET, NET_WORTH_HEADERS)

  for (const snapshot of snapshots) {
    await appendSheetRow(spreadsheetId, NET_WORTH_SHEET, netWorthSnapshotToRow(snapshot), {
      skipRevision: true
    })
  }
  notifySpreadsheetDataChanged(spreadsheetId)
}

/** A manual edit of a month: replaces its row (whatever its source) with `manual`. */
export async function saveManualNetWorth(
  spreadsheetId: string,
  monthKey: string,
  values: Pick<NetWorthSnapshot, 'netWorth' | 'liabilities'>
): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, NET_WORTH_SHEET, NET_WORTH_HEADERS)

  const row = netWorthSnapshotToRow({
    monthKey,
    netWorth: values.netWorth,
    liabilities: values.liabilities,
    assets: values.netWorth + values.liabilities,
    recordedAt: netWorthTimestamp(),
    source: 'manual'
  })
  const current = (await fetchSheetSnapshots(spreadsheetId)).find(
    item => item.monthKey === monthKey
  )

  if (current) await updateSheetRow(spreadsheetId, NET_WORTH_SHEET, current.rowNumber, row)
  else await appendSheetRow(spreadsheetId, NET_WORTH_SHEET, row)
}

export async function exportNetWorthCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, NET_WORTH_SHEET, NET_WORTH_HEADERS, 'دارایی ماهانه.csv')
}

/** Rows keyed by month: a month that already has a row is skipped. */
export async function importNetWorthCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, NET_WORTH_SHEET, NET_WORTH_HEADERS, csvContent, cells => {
    const snapshot = rowToNetWorthSnapshot(cells)

    return snapshot
      ? netWorthSnapshotToRow({
          ...snapshot,
          recordedAt: snapshot.recordedAt || netWorthTimestamp()
        })
      : null
  })
}
