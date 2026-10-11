import { parseArchiveSheetName } from './recordArchive'
import { getSettings } from './settings'
import { getSheetTitles } from './sheetsEnsure'
import { normalizeSheetTitle } from './sheetsMeta'
import { resolveTargetRow, RowConflictError, type RowGuardSession } from './sheetsRowGuard'

/** Yearly archive tabs of the form whose tab is `sheetName`; none for other tabs. */
async function archivesOf(spreadsheetId: string, sheetName: string): Promise<string[]> {
  const forms = getSettings()?.forms ?? []

  const base = normalizeSheetTitle(sheetName)

  if (!forms.some(form => normalizeSheetTitle(form.sheetName) === base)) return []

  return (await getSheetTitles(spreadsheetId)).filter(title => {
    const archive = parseArchiveSheetName(title, forms)

    return archive !== null && normalizeSheetTitle(archive.form.sheetName) === base
  })
}

/**
 * Where `expectedRow` lives now. A queued edit may target a form-tab row that
 * a sweep has since moved into a yearly archive; it is followed there by id.
 */
export async function resolveRowAnywhere(
  session: RowGuardSession,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  expectedRow?: string[]
): Promise<{ sheetName: string; rowNumber: number }> {
  try {
    return {
      sheetName,
      rowNumber: await resolveTargetRow(session, spreadsheetId, sheetName, rowNumber, expectedRow)
    }
  } catch (err) {
    if (!(err instanceof RowConflictError) || !expectedRow?.[0]?.trim()) throw err

    for (const archive of await archivesOf(spreadsheetId, sheetName)) {
      const found = await resolveTargetRow(session, spreadsheetId, archive, 0, expectedRow).catch(
        () => null
      )

      if (found !== null) return { sheetName: archive, rowNumber: found }
    }

    throw err
  }
}
