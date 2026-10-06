/**
 * Monotonic counter per sheet, bumped on every local write. A background fetch
 * records the counters before it goes to the network and only overwrites sheets
 * whose counter did not move meanwhile — otherwise a refresh that started before
 * a local delete would bring the deleted row back and shift row numbers.
 */
const versions = new Map<string, number>()

function versionKey(spreadsheetId: string, sheetName: string): string {
  return `${spreadsheetId}\u0000${sheetName}`
}

export function bumpSheetWriteVersion(spreadsheetId: string, sheetName: string): void {
  const key = versionKey(spreadsheetId, sheetName)

  versions.set(key, (versions.get(key) ?? 0) + 1)
}

export function getSheetWriteVersion(spreadsheetId: string, sheetName: string): number {
  return versions.get(versionKey(spreadsheetId, sheetName)) ?? 0
}

export function snapshotSheetWriteVersions(
  spreadsheetId: string,
  sheetNames: Iterable<string>
): Map<string, number> {
  const snapshot = new Map<string, number>()

  for (const sheetName of sheetNames) {
    snapshot.set(sheetName, getSheetWriteVersion(spreadsheetId, sheetName))
  }

  return snapshot
}
