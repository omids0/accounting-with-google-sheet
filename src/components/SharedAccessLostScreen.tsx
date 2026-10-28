import { useState } from 'react'

import AppIcon from './AppIcon'
import { forgetSharedQuestion, SHARED_ACTION_LABELS } from './shared/sharedSpaceState'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { animateInClass } from './ui/layoutStyles'
import {
  loginCardClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoTitleClass,
  loginPageClass
} from './ui/loginStyles'
import { useOpenSheetWithGoogle } from '../hooks/useOpenSheetWithGoogle'
import { clearSharedAccessLost, sharedNoAccessNamed } from '../services/sharedAccessLost'
import { forgetUnreachableShared } from '../services/sharedForget'
import { sharedNameOf } from '../services/sharedWorkspace'
import { getSpreadsheetLabel } from '../services/spreadsheetCatalog'
import { activateSpreadsheet } from '../services/spreadsheetSetup'
import type { SpreadsheetEntry } from '../types'
import { cn } from '../utils/cn'
import { confirmDelete } from '../utils/confirmDelete'
import { showError } from '../utils/toast'
import { toUserMessage } from '../utils/userMessage'

interface SharedAccessLostScreenProps {
  /** The shared account that was the open sheet and could not be opened. */
  sheet: SpreadsheetEntry
  /** The user's own sheet, which takes over. */
  personal: SpreadsheetEntry
  /** The app has an open sheet again. */
  onDone: () => void | Promise<void>
}

const buttonStyle = { width: '100%', marginTop: '0.75rem' } as const

/**
 * The start screen when the open sheet is the shared account and this device cannot read it (the
 * owner removed the user, or the device has no grant for the file): the same calm words and
 * actions as the shared card on «فضاهای من», plus a way into the personal books.
 */
export default function SharedAccessLostScreen({
  sheet,
  personal,
  onDone
}: SharedAccessLostScreenProps) {
  const [busy, setBusy] = useState(false)
  // The Picker gives this device the file again: the account opens like before.
  const { available, opening, openWithGoogle } = useOpenSheetWithGoogle(async () => {
    clearSharedAccessLost(sheet.id)
    await onDone()
  })

  const name = sharedNameOf(getSpreadsheetLabel(sheet.name))

  const run = async (task: () => Promise<unknown>, fail: string) => {
    setBusy(true)
    try {
      await task()
      await onDone()
    } catch (err) {
      showError(toUserMessage(err, fail))
    } finally {
      setBusy(false)
    }
  }

  const forget = async () => {
    if (!(await confirmDelete(forgetSharedQuestion(name)))) return

    await run(async () => {
      if (!(await forgetUnreachableShared(sheet.id))) throw new Error('forget')
    }, 'پاک کردن حساب مشترک ناموفق بود')
  }

  return (
    <div className={loginPageClass}>
      <div className={cn(loginCardClass, animateInClass)}>
        <div className={loginLogoClass}>
          <span className={loginLogoIconClass}>
            <AppIcon name="folder" />
          </span>
          <h1 className={loginLogoTitleClass}>حساب مشترک باز نشد</h1>
        </div>
        <Alert variant="warning">{sharedNoAccessNamed(name)}</Alert>
        {available ? (
          <Button
            variant="primary"
            loading={opening}
            disabled={busy || opening}
            onClick={() => void openWithGoogle()}
            style={buttonStyle}
          >
            {SHARED_ACTION_LABELS.reconnect}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={busy || opening}
          loading={busy}
          onClick={() =>
            void run(() => activateSpreadsheet(personal.id), 'باز کردن دفتر شخصی ناموفق بود')
          }
          style={buttonStyle}
        >
          رفتن به دفتر شخصی
        </Button>
        <Button
          variant="secondary"
          disabled={busy || opening}
          onClick={() => void forget()}
          style={buttonStyle}
        >
          {SHARED_ACTION_LABELS.forget}
        </Button>
      </div>
    </div>
  )
}
