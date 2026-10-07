import { useCallback, useEffect, useState } from 'react'

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
import { handleSheetError } from '../../utils/sheetError'

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

  useEffect(() => {
    void reload()
  }, [reload])

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

    try {
      await deleteSmsTemplate(spreadsheetId, template.rowNumber)
      await reload()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در حذف قالب پیامک' })
    }
  }

  return { templates, loading, saving, reload, add, remove }
}
