import { useEffect, useState } from 'react'

import { getBackupState, subscribeBackupState, type BackupState } from '../services/backupReminder'

/** «آخرین پشتیبان» and reminder settings of a spreadsheet, re-read on every change. */
export function useBackupState(spreadsheetId: string): BackupState {
  const [state, setState] = useState(() => getBackupState(spreadsheetId))

  useEffect(() => {
    const read = () => setState(getBackupState(spreadsheetId))

    read()

    return subscribeBackupState(read)
  }, [spreadsheetId])

  return state
}
