import { useState } from 'react'

import { isPickerAvailable, pickSpreadsheetWithGoogle } from '../services/googlePicker'
import { getSettings } from '../services/settings'
import { mentionsAccounting } from '../services/spreadsheetCatalog'
import { activateSpreadsheet } from '../services/spreadsheetSetup'
import { showError } from '../utils/toast'

/**
 * «باز کردن شیت با گوگل»: the user picks a spreadsheet in Google Picker, which
 * grants the app drive.file access to that one file, then it becomes active.
 */
export function useOpenSheetWithGoogle(onOpened: (spreadsheetId: string) => void | Promise<void>) {
  const [opening, setOpening] = useState(false)

  const openWithGoogle = async () => {
    setOpening(true)
    try {
      const picked = await pickSpreadsheetWithGoogle()

      if (!picked) return
      if (!mentionsAccounting(picked.name)) {
        throw new Error(
          'این فایل شیت حسابداری به نظر نمی‌رسد. فقط شیتی را انتخاب کنید که نامش «حسابداری» دارد.'
        )
      }

      await activateSpreadsheet(picked.id, getSettings()?.spreadsheetId, picked.name)
      await onOpened(picked.id)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'باز کردن شیت با گوگل ناموفق بود')
    } finally {
      setOpening(false)
    }
  }

  return { available: isPickerAvailable(), opening, openWithGoogle }
}

export type OpenSheetWithGoogle = ReturnType<typeof useOpenSheetWithGoogle>
