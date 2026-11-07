import { useCallback, useEffect, useMemo, useState } from 'react'

import { toChildEntries, type ChildEntry } from './childViewModel'
import { markChildAccessLostIfDenied } from '../../services/childAccessLost'
import { useDataRevision } from '../../services/dataRevision'
import { getSettings } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import type { CustomForm } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import { isRecordForm } from '../form/sharedFields'
import { enrichRecord, sortRecords, type StoredRecord } from '../records/recordsUtils'

/**
 * A child's income and expense records for a parent's read-only pages: both record forms read
 * from the mirror (again after every sync), newest first, with the forms the detail sheet needs.
 * Nothing here writes. A refused read marks the child «دسترسی قطع شده» (`childAccessLost`); a
 * failed read sets `loadFailed` (so a page shows «بارگذاری انجام نشد» with a retry, never the
 * «no records yet» state) and `reload` reads again.
 */
export function useChildRecords() {
  const revision = useDataRevision()
  const [forms, setForms] = useState<CustomForm[]>([])
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      setLoading(false)

      return
    }

    let live = true

    setLoading(true)
    const recordForms = settings.forms.filter(isRecordForm)

    void Promise.all(
      recordForms.map(async form =>
        (await fetchRecords(settings.spreadsheetId, form)).map(record => enrichRecord(record, form))
      )
    )
      .then(batches => {
        if (!live) return
        setLoadFailed(false)
        setForms(recordForms)
        setRecords(sortRecords(batches.flat(), recordForms))
      })
      .catch(err => {
        if (live) setLoadFailed(true)
        if (live && !markChildAccessLostIfDenied(settings.spreadsheetId, err)) {
          handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })
        }
      })
      .finally(() => live && setLoading(false))

    return () => {
      live = false
    }
  }, [revision, attempt])

  const entries: ChildEntry[] = useMemo(() => toChildEntries(records, forms), [records, forms])

  return { forms, records, entries, loading, loadFailed, reload }
}
