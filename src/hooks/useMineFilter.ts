import { useCallback, useMemo, useState } from 'react'

import { useSharing } from './useSharing'
import { getUserEmail } from '../services/auth'
import { buildMineChip } from '../utils/filterChips'
import { parseWriter } from '../utils/writerColumn'

/** Props `PageFilterPanel` takes for the «فقط من» toggle; empty on a private sheet. */
export type MineFilterPanelProps = {
  mineOnly?: boolean
  onMineOnlyChange?: (next: boolean) => void
}

/**
 * «فقط من»: rows whose «ثبت‌کننده» is the signed-in account. Only offered on a
 * shared spreadsheet and when the list can tell who wrote a row.
 */
export function useMineFilter<T>(getWriter?: (item: T) => string | undefined) {
  const { shared } = useSharing()
  const enabled = shared && Boolean(getWriter)
  const [mineOnly, setMineOnly] = useState(false)
  const [draftMineOnly, setDraftMineOnly] = useState(false)
  const active = enabled && mineOnly

  const matches = useCallback(
    (item: T) => {
      if (!active || !getWriter) return true

      return parseWriter(getWriter(item)) === parseWriter(getUserEmail())
    },
    [active, getWriter]
  )

  const chip = useMemo(() => (active ? buildMineChip(() => setMineOnly(false)) : null), [active])

  const panelProps: MineFilterPanelProps = useMemo(
    () => (enabled ? { mineOnly: draftMineOnly, onMineOnlyChange: setDraftMineOnly } : {}),
    [draftMineOnly, enabled]
  )

  return {
    active,
    matches,
    chip,
    panelProps,
    startDraft: useCallback(() => setDraftMineOnly(mineOnly), [mineOnly]),
    applyDraft: useCallback(() => setMineOnly(draftMineOnly), [draftMineOnly]),
    clearDraft: useCallback(() => setDraftMineOnly(false), []),
    clearAll: useCallback(() => setMineOnly(false), [])
  }
}
