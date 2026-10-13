import { useCallback, useEffect } from 'react'
import { create } from 'zustand'

import { getSettings } from '../services/settings'
import {
  getSharingInfo,
  onSharingChange,
  writerLabel,
  type SharingInfo,
  type WriterLabel
} from '../services/sharing'
import { useAppStore } from '../stores/appStore'

interface SharingStore {
  spreadsheetId: string
  info: SharingInfo | null
  load: (spreadsheetId: string) => void
}

const initialId = getSettings()?.spreadsheetId ?? ''

const useSharingStore = create<SharingStore>((set, get) => ({
  spreadsheetId: initialId,
  info: getSharingInfo(initialId),
  load: spreadsheetId => {
    // Every list row mounts this hook: only a sheet switch reads storage again.
    if (get().spreadsheetId === spreadsheetId) return
    set({ spreadsheetId, info: getSharingInfo(spreadsheetId) })
  }
}))

onSharingChange((spreadsheetId, info) => {
  if (useSharingStore.getState().spreadsheetId === spreadsheetId) {
    useSharingStore.setState({ info })
  }
})

export interface UseSharingResult {
  /** More than one Google account can edit the active spreadsheet. */
  shared: boolean
  info: SharingInfo | null
  label: (email: string) => WriterLabel
}

/** Who can edit the active spreadsheet, from the last Drive check (refreshed daily). */
export function useSharing(): UseSharingResult {
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)
  const info = useSharingStore(state => state.info)
  const load = useSharingStore(state => state.load)

  useEffect(() => {
    load(getSettings()?.spreadsheetId ?? '')
  }, [load, spreadsheetKey])

  const label = useCallback((email: string) => writerLabel(email, info), [info])

  return { shared: info?.shared === true, info, label }
}
