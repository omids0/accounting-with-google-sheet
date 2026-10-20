import { useNavigate } from 'react-router'

import { getSettings, getSpreadsheets } from '../../services/settings'
import { switchActiveSpreadsheet } from '../../services/spreadsheetSetup'
import { moveSyncToSpreadsheet } from '../../services/spreadsheetSwitch'
import { personalSpreadsheet } from '../../services/workspace'
import { bumpSpreadsheetKey } from '../../stores/appStore'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { useSheetSwitchGuard } from '../settings/useSheetSwitchGuard'

/**
 * «برگشت به حساب شخصی»: activates the manager's own spreadsheet and opens its dashboard. Leaving
 * a building with unsent changes asks first, like every sheet switch (`modalProps`).
 */
export function useReturnToPersonal(onDone?: () => void) {
  const navigate = useNavigate()
  const currentId = getSettings()?.spreadsheetId ?? ''
  const { guard, modalProps } = useSheetSwitchGuard(currentId)

  const run = async () => {
    const personal = personalSpreadsheet(getSpreadsheets())

    try {
      if (personal) {
        await switchActiveSpreadsheet(personal.id)
        await moveSyncToSpreadsheet(currentId, personal.id)
      }
      bumpSpreadsheetKey()
      onDone?.()
      navigate('/')
    } catch (err) {
      showError(toUserMessage(err, 'خطا در تغییر شیت'))
    }
  }

  return { returnToPersonal: () => void guard(run), modalProps }
}
