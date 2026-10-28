import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router'

import type { Tab } from '../components/layout/types'
import { useSheetSwitchGuard } from '../components/settings/useSheetSwitchGuard'
import { getPathForTab } from '../routes/paths'
import { WORKSPACE_HOME } from '../routes/workspaceRedirect'
import { getSettings } from '../services/settings'
import {
  classifySharedFailure,
  markSharedAccessLost,
  SHARED_NO_ACCESS_MESSAGE
} from '../services/sharedAccessLost'
import { switchActiveSpreadsheet } from '../services/spreadsheetSetup'
import { moveSyncToSpreadsheet } from '../services/spreadsheetSwitch'
import { getWorkspaceType, rememberPersonalSheet } from '../services/workspace'
import { bumpSpreadsheetKey } from '../stores/appStore'
import { hideBusy, releaseBusyWhenReady, showBusy } from '../stores/busyOverlayStore'
import { showError } from '../utils/toast'
import { toUserMessage } from '../utils/userMessage'

/** What differs between entering a building and entering the shared account. */
export interface WorkspaceEntry {
  kind: 'building' | 'shared'
  /** The page that opens: the caller's `tab`, or the workspace's own choice. */
  destination: (requested: Tab | undefined, spreadsheetId: string) => Tab
  /** The busy overlay's text while the sheet opens. */
  busyMessage: (spreadsheetId: string) => string
  failMessage: string
  /** The sheet cannot be opened from here (removed share, no grant): what to say, and who to tell. */
  denied?: { message: string; onDenied: (spreadsheetId: string) => void }
}

export const SHARED_ENTRY: WorkspaceEntry = {
  kind: 'shared',
  destination: requested => requested ?? 'shared-home',
  busyMessage: () => 'در حال ورود به حساب مشترک…',
  failMessage: 'ورود به حساب مشترک ناموفق بود',
  denied: { message: SHARED_NO_ACCESS_MESSAGE, onDenied: markSharedAccessLost }
}

/**
 * «ورود» to a member workspace (the shared account by default, a building through
 * `useEnterBuilding`): makes the sheet active (the sheet-switch guard asks first when the current
 * one has unsent changes) and opens `entry.destination`. The personal spreadsheet is remembered on
 * this device for «برگشت به حساب شخصی» only when the sheet being left is personal, so leaving a
 * building or the shared account keeps it. Between two workspaces of the same kind the open page
 * belongs to the one being left: it steps to the home first, whose skeleton waits for the new
 * data. Entering the sheet that is already open just opens the page. `onDone` runs once the page
 * is open; `entering` is the sheet being opened right now. The busy overlay shows from the moment
 * the unsent-changes question (if any) is answered until the page is ready; `message` replaces
 * its text. `enter` resolves to whether the workspace was opened.
 */
export function useEnterWorkspace(onDone?: () => void, entry: WorkspaceEntry = SHARED_ENTRY) {
  const navigate = useNavigate()
  const currentId = getSettings()?.spreadsheetId ?? ''
  const { guard, modalProps } = useSheetSwitchGuard(currentId, hideBusy)
  const [entering, setEntering] = useState<string | null>(null)

  const open = (spreadsheetId: string, tab?: Tab) => {
    navigate(getPathForTab(entry.destination(tab, spreadsheetId)))
    onDone?.()
  }

  const run = async (spreadsheetId: string, tab?: Tab, message?: string): Promise<boolean> => {
    setEntering(spreadsheetId)
    showBusy(message ?? entry.busyMessage(spreadsheetId))
    try {
      const leaving = currentId ? getWorkspaceType(currentId) : null

      if (leaving === 'personal') rememberPersonalSheet(currentId)
      else if (leaving === entry.kind) {
        navigate(getPathForTab(WORKSPACE_HOME[entry.kind]), { replace: true })
      }
      await switchActiveSpreadsheet(spreadsheetId)
      await moveSyncToSpreadsheet(currentId, spreadsheetId)
      // The route guard sends a workspace away from foreign pages as soon as it flips. Let that
      // settle first, so the page we want is the last navigation instead of being overridden.
      flushSync(() => bumpSpreadsheetKey())
      open(spreadsheetId, tab)
      releaseBusyWhenReady()

      return true
    } catch (err) {
      hideBusy()
      const denied = entry.denied && classifySharedFailure(err) === 'denied' ? entry.denied : null

      denied?.onDenied(spreadsheetId)
      showError(denied ? denied.message : toUserMessage(err, entry.failMessage))

      return false
    } finally {
      setEntering(null)
    }
  }

  return {
    enter: async (spreadsheetId: string, tab?: Tab, message?: string): Promise<boolean> => {
      if (entering) return false
      if (spreadsheetId === currentId) {
        open(spreadsheetId, tab)

        return true
      }

      let opened = false

      await guard(async () => {
        opened = await run(spreadsheetId, tab, message)
      })

      return opened
    },
    entering,
    modalProps
  }
}
