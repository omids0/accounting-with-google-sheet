import type { CustomForm } from '../types'
import { parseArchiveSheetName } from './recordArchive'
import { normalizeSheetTitle } from './sheetsMeta'
import { getSyncMeta, updateSyncMeta } from './spreadsheetSyncMeta'

/**
 * Archive tabs this app created (they carry the `accounting_archive` marker),
 * persisted with the mirror. A tab merely named like an archive is never read,
 * deleted from or written to as one.
 */
export function getArchiveTabs(spreadsheetId: string): string[] {
  return getSyncMeta(spreadsheetId)?.archiveTabs ?? []
}

export function setArchiveTabs(spreadsheetId: string, titles: string[]): void {
  const current = getArchiveTabs(spreadsheetId)

  if (current.length === titles.length && current.every((title, i) => title === titles[i])) return

  updateSyncMeta(spreadsheetId, { archiveTabs: titles })
}

export function addArchiveTab(spreadsheetId: string, title: string): void {
  const current = getArchiveTabs(spreadsheetId)

  if (current.some(item => normalizeSheetTitle(item) === normalizeSheetTitle(title))) return

  updateSyncMeta(spreadsheetId, { archiveTabs: [...current, title] })
}

/** The form's archive tabs, oldest year first. */
export function archiveTabsOfForm(
  spreadsheetId: string,
  form: CustomForm,
  forms: CustomForm[]
): string[] {
  return getArchiveTabs(spreadsheetId)
    .map(title => ({ title, archive: parseArchiveSheetName(title, forms) }))
    .filter(({ archive }) => archive?.form.id === form.id)
    .sort((a, b) => (a.archive?.year ?? 0) - (b.archive?.year ?? 0))
    .map(({ title }) => title)
}
