import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clearEntryDraft,
  loadEntryDraft,
  saveEntryDraft,
  type EntryDraftValues
} from '../../utils/entryDraft'

const SAVE_DELAY_MS = 400

type Params = {
  formId: string
  /** Off for forms opened pre-filled (bank SMS, share target) and for edit forms. */
  enabled: boolean
  fieldIds: string[]
  initialValues: EntryDraftValues
  values: EntryDraftValues
  setValue: (id: string, value: string | number) => void
  reset: (values: EntryDraftValues) => void
}

/**
 * Keeps an unsent entry across navigation: restores it when the form mounts, saves after each
 * change (debounced), and lets the form drop it (`clearDraft` after a save or cancel, `discard`
 * for the «پاک کردن» link).
 */
export function useEntryDraft({
  formId,
  enabled,
  fieldIds,
  initialValues,
  values,
  setValue,
  reset
}: Params) {
  const [restored, setRestored] = useState(false)
  const latest = useRef({ formId, enabled, initialValues, values, fieldIds, setValue })
  const suppressed = useRef(false)

  latest.current = { formId, enabled, initialValues, values, fieldIds, setValue }

  useEffect(() => {
    const current = latest.current

    if (!current.enabled) return

    const draft = loadEntryDraft(current.formId, current.fieldIds)

    if (!draft) return

    Object.entries(draft).forEach(([id, value]) => current.setValue(id, value))
    setRestored(true)
  }, [formId, enabled])

  const signature = JSON.stringify(values)

  useEffect(() => {
    if (!enabled) return

    suppressed.current = false

    const timer = setTimeout(() => {
      const current = latest.current

      saveEntryDraft(current.formId, current.values, current.initialValues)
    }, SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [signature, enabled, formId])

  // Leaving within the delay must not lose the last keystrokes.
  useEffect(
    () => () => {
      const current = latest.current

      if (current.enabled && !suppressed.current) {
        saveEntryDraft(current.formId, current.values, current.initialValues)
      }
    },
    []
  )

  /** After a save or «انصراف»: the draft is gone and must not be written back on unmount. */
  const clearDraft = useCallback(() => {
    suppressed.current = true
    clearEntryDraft(latest.current.formId)
  }, [])

  const discard = useCallback(() => {
    clearDraft()
    reset(latest.current.initialValues)
    setRestored(false)
  }, [clearDraft, reset])

  return { restored, clearDraft, discard }
}
