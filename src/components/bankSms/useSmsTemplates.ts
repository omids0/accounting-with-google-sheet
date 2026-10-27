import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { guessTemplate } from '../../services/bankSmsGuess'
import { sampleRefDigits } from '../../services/bankSmsMatch'
import { learnSmsRef } from '../../services/bankSmsPrefs'
import {
  createSmsTemplate,
  deleteSmsTemplate,
  fetchSmsTemplates,
  type SmsTemplateWithRow
} from '../../services/bankSmsTemplates'
import { getSettings } from '../../services/settings'
import type { SmsTemplate } from '../../types'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete } from '../../utils/confirmDelete'
import { haptic } from '../../utils/haptics'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'

/** All saved SMS templates of the current spreadsheet, with add/remove. */
export function useSmsTemplates() {
  const [templates, setTemplates] = useState<SmsTemplateWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    setLoading(true)
    try {
      setTemplates(await fetchSmsTemplates(spreadsheetId))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در خواندن قالب‌های پیامک' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Also after a sync: templates may arrive from another device or a revived write.
  const dataRevision = useDataRefresh()

  useEffect(() => {
    void reload()
  }, [reload, dataRevision])

  /** `sampleRef`: digits shown in the sample SMS, tied to the account on save. */
  const add = async ({
    sampleRef,
    ...input
  }: Omit<SmsTemplate, 'id' | 'createdAt'> & { sampleRef?: string }) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return null

    setSaving(true)
    try {
      const template = await createSmsTemplate(spreadsheetId, input)

      learnSmsRef(sampleRef, input.accountId)

      await reload()

      return template
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره قالب پیامک' })

      return null
    } finally {
      setSaving(false)
    }
  }

  const remove = async (template: SmsTemplateWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const confirmed = await confirmDelete({
      label: 'قالب پیامک',
      message:
        'پیامک‌هایی به این شکل دیگر خودکار شناخته نمی‌شوند؛ هر وقت خواستی می‌توانی دوباره قالب بسازی.'
    })

    if (!confirmed) return

    try {
      await deleteSmsTemplate(spreadsheetId, template.rowNumber)
      await reload()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در حذف قالب پیامک' })
    }
  }

  /** Unknown SMS: the tapped number is the amount; SMS of the same shape are recognised once it is saved. */
  const teachAmount = async (body: string, tokenIndex: number, accountId: string) => {
    const guess = guessTemplate(body, templates, tokenIndex)
    const saved = await add({ ...guess, accountId, sampleRef: sampleRefDigits(guess.parts, body) })

    if (saved) {
      haptic('light')
      showSuccess('قالب ساخته شد؛ پیامک‌های هم‌شکل شناخته شدند')
    }
  }

  return { templates, loading, saving, reload, add, remove, teachAmount }
}
