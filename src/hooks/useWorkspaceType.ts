import { useSyncExternalStore } from 'react'

import {
  getActiveWorkspaceResolution,
  getActiveWorkspaceType,
  subscribeWorkspace,
  type WorkspaceType
} from '../services/workspace'
import { useAppStore } from '../stores/appStore'

/** Type of the active spreadsheet; follows a sheet switch and the first read of a new sheet. */
export function useWorkspaceType(): WorkspaceType {
  // `spreadsheetKey` is bumped on every switch; the snapshot is read again with it.
  useAppStore(state => state.spreadsheetKey)

  return useSyncExternalStore(subscribeWorkspace, getActiveWorkspaceType)
}

export function useIsBuildingWorkspace(): boolean {
  return useWorkspaceType() === 'building'
}

/** Like `useWorkspaceType`, but `unknown` while the active sheet's type is still being read. */
export function useWorkspaceResolution(): WorkspaceType | 'unknown' {
  useAppStore(state => state.spreadsheetKey)

  return useSyncExternalStore(subscribeWorkspace, getActiveWorkspaceResolution)
}
