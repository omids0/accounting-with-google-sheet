import { useEffect, useState } from 'react'

import { useDataRevision } from '../services/dataRevision'
import {
  activeParents,
  listParents,
  localParents,
  type ParentAccess
} from '../services/parentAccess'
import { getSettings } from '../services/settings'
import { isPersonalWorkspace } from '../services/workspace'

/** How long a Drive-checked count is trusted before the menu asks Drive again. */
const FRESH_MS = 5 * 60 * 1000

let checked: { id: string; at: number; count: number } | null = null

/** The page «والدین من» has just asked Drive: the menu badge follows it without asking again. */
export function rememberParentCount(spreadsheetId: string, list: readonly ParentAccess[]): void {
  checked = { id: spreadsheetId, at: Date.now(), count: activeParents(list).length }
}

function cachedCount(spreadsheetId: string): number | null {
  return checked?.id === spreadsheetId ? checked.count : null
}

/**
 * How many parents can see this (personal) account right now, for the badge on the menu entry
 * «والدین من»: the marker rows at once (no network), then Drive's permission list once in a while
 * so a parent who ended the access stops counting. 0 outside the personal workspace.
 */
export function useActiveParentCount(): number {
  const revision = useDataRevision()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const [count, setCount] = useState(
    () => cachedCount(spreadsheetId) ?? localParents(spreadsheetId).length
  )

  useEffect(() => {
    if (!spreadsheetId || !isPersonalWorkspace(spreadsheetId)) {
      setCount(0)

      return
    }

    const local = localParents(spreadsheetId).length

    setCount(cachedCount(spreadsheetId) ?? local)
    if (!local || (checked?.id === spreadsheetId && Date.now() - checked.at < FRESH_MS)) return

    let live = true

    void listParents(spreadsheetId)
      .then(list => {
        rememberParentCount(spreadsheetId, list)
        if (live) setCount(activeParents(list).length)
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [spreadsheetId, revision])

  return count
}
