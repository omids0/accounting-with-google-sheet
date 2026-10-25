import { useNavigate } from 'react-router'

import { RETURNING_MESSAGE } from './buildingBusyText'
import { getSettings, getSpreadsheets } from '../../services/settings'
import { switchActiveSpreadsheet } from '../../services/spreadsheetSetup'
import { moveSyncToSpreadsheet } from '../../services/spreadsheetSwitch'
import { personalSpreadsheet } from '../../services/workspace'
import { bumpSpreadsheetKey } from '../../stores/appStore'
import { hideBusy, releaseBusyWhenReady, showBusy } from '../../stores/busyOverlayStore'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { useSheetSwitchGuard } from '../settings/useSheetSwitchGuard'

/**
 * «برگشت به حساب شخصی»: activates the user's own spreadsheet (never a building or the shared
 * account: `personalSpreadsheet`) and opens its dashboard. Leaving a building or the shared account
 * with unsent changes asks first, like every sheet switch (`modalProps`). The wait shows the busy
 * overlay until the personal dashboard is ready.
 */
export function useReturnToPersonal(onDone?: () => void) {
  const navigate = useNavigate()
  const currentId = getSettings()?.spreadsheetId ?? ''
  const { guard, modalProps } = useSheetSwitchGuard(currentId, hideBusy)

  const run = async () => {
    const personal = personalSpreadsheet(getSpreadsheets())

    showBusy(RETURNING_MESSAGE)
    try {
      if (personal) {
        await switchActiveSpreadsheet(personal.id)
        await moveSyncToSpreadsheet(currentId, personal.id)
      }
      bumpSpreadsheetKey()
      onDone?.()
      navigate('/')
      releaseBusyWhenReady()
    } catch (err) {
      hideBusy()
      showError(toUserMessage(err, 'خطا در تغییر شیت'))
    }
  }

  return { returnToPersonal: () => void guard(run), modalProps }
}
