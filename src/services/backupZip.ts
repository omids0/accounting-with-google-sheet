import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

export const BACKUP_FORMAT = 'hesab-ketab-backup'

export const BACKUP_FORMAT_VERSION = 1

export const MANIFEST_FILE = 'manifest.json'

const BOM = String.fromCharCode(0xfeff)

export interface BackupManifestTab {
  name: string
  file: string
  rows: number
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  appVersion: string
  spreadsheetLabel: string
  /** ISO time of the export. */
  exportedAt: string
  tabs: BackupManifestTab[]
}

export interface BackupTabFile {
  name: string
  csv: string
  rows: number
}

export const INVALID_BACKUP_MESSAGE = 'این فایل پشتیبان کامل حساب کتاب نیست.'

/** Characters a file system rejects, or a zip reads as a folder. */
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|]/g

/** One CSV per tab; names stay readable and unique even after unsafe characters are replaced. */
function tabFileNames(tabs: { name: string }[]): string[] {
  const used = new Set<string>()

  return tabs.map(tab => {
    const base = tab.name.replace(UNSAFE_FILE_CHARS, '-').trim() || 'tab'

    let file = `${base}.csv`

    for (let n = 2; used.has(file); n++) file = `${base} (${n}).csv`
    used.add(file)

    return file
  })
}

export function buildBackupManifest(
  tabs: BackupTabFile[],
  meta: { appVersion: string; spreadsheetLabel: string; exportedAt: Date }
): BackupManifest {
  const files = tabFileNames(tabs)

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: meta.appVersion,
    spreadsheetLabel: meta.spreadsheetLabel,
    exportedAt: meta.exportedAt.toISOString(),
    tabs: tabs.map((tab, index) => ({ name: tab.name, file: files[index], rows: tab.rows }))
  }
}

export function packBackup(manifest: BackupManifest, tabs: BackupTabFile[]) {
  const entries: Record<string, Uint8Array> = {
    [MANIFEST_FILE]: strToU8(JSON.stringify(manifest, null, 2))
  }

  manifest.tabs.forEach((tab, index) => {
    // The BOM lets Excel open a single extracted CSV with Persian text intact.
    entries[tab.file] = strToU8(`${BOM}${tabs[index].csv}`)
  })

  return zipSync(entries)
}

function isManifest(value: unknown): value is BackupManifest {
  const manifest = value as BackupManifest | null

  return (
    manifest?.format === BACKUP_FORMAT &&
    typeof manifest.appVersion === 'string' &&
    typeof manifest.exportedAt === 'string' &&
    Array.isArray(manifest.tabs) &&
    manifest.tabs.every(tab => typeof tab?.name === 'string' && typeof tab.file === 'string')
  )
}

/** The manifest and each listed tab's CSV; throws a user-facing message for anything else. */
export function unpackBackup(bytes: Uint8Array): {
  manifest: BackupManifest
  csvByTab: Map<string, string>
} {
  let files: Record<string, Uint8Array>

  let manifest: unknown

  try {
    files = unzipSync(bytes)
    manifest = JSON.parse(strFromU8(files[MANIFEST_FILE] ?? new Uint8Array()))
  } catch {
    throw new Error(INVALID_BACKUP_MESSAGE)
  }

  if (!isManifest(manifest)) throw new Error(INVALID_BACKUP_MESSAGE)
  if (manifest.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('این پشتیبان با نسخه جدیدتر اپ ساخته شده؛ اول اپ را به‌روز کن.')
  }

  const csvByTab = new Map<string, string>()

  for (const tab of manifest.tabs) {
    const file = files[tab.file]

    // parseCsv drops the leading BOM.
    if (file) csvByTab.set(tab.name, strFromU8(file))
  }

  return { manifest, csvByTab }
}
