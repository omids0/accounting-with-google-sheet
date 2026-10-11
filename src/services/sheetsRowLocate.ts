import { archiveTabsOfForm } from './archiveRegistry'
import { getSettings } from './settings'
import { normalizeSheetTitle } from './sheetsMeta'
import { resolveTargetRow, RowConflictError, type RowGuardSession } from './sheetsRowGuard'

/** The app's archive tabs of the form whose tab is `sheetName`; none for other tabs. */
function archivesOf(spreadsheetId: string, sheetName: string): string[] {
  const forms = getSettings()?.forms ?? []

  const form = forms.find(
    item => normalizeSheetTitle(item.sheetName) === normalizeSheetTitle(sheetName)
  )

  return form ? archiveTabsOfForm(spreadsheetId, form, forms) : []
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

    for (const archive of archivesOf(spreadsheetId, sheetName)) {
      const found = await resolveTargetRow(session, spreadsheetId, archive, 0, expectedRow).catch(
        () => null
      )

      if (found !== null) return { sheetName: archive, rowNumber: found }
    }

    throw err
  }
}
