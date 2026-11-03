import { useCallback, useEffect, useMemo, useState } from 'react'

import { activityPerson } from './activityText'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSharing } from '../../hooks/useSharing'
import { fetchActivityLog, type ActivityEntry } from '../../services/activityLog'
import { ACTIVITY_MODULE_LABELS, type ActivityModule } from '../../services/activityLogText'
import { getUserEmail } from '../../services/auth'
import { getSettings } from '../../services/settings'
import { ACTIVITY_LOG_SHEET } from '../../services/sheetNames'

export const ACTIVITY_PAGE_SIZE = 50

/** Every row the tab can hold; the page filters and pages them on the client. */
const READ_LIMIT = 100_000

export const ALL = 'all'

export interface ActivityChip {
  id: string
  label: string
}

function moduleLabel(module: string): string {
  return ACTIVITY_MODULE_LABELS[module as ActivityModule] ?? module
}

/** «فعالیت»: the feed newest first, filtered by person and module, 50 at a time. */
export function useActivityPage() {
  const revision = useDataRefresh()
  const { info } = useSharing()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [person, setPerson] = useState(ALL)
  const [module, setModule] = useState(ALL)
  const [shown, setShown] = useState(ACTIVITY_PAGE_SIZE)

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return setLoading(false)

    let live = true

    void fetchActivityLog(spreadsheetId, READ_LIMIT, 0).then(list => {
      if (!live) return
      setEntries(list)
      setLoading(false)
    })

    return () => {
      live = false
    }
  }, [revision, reload])

  const people = useMemo<ActivityChip[]>(() => {
    const me = (getUserEmail() ?? '').toLowerCase()
    const names = new Map<string, string>()

    for (const editor of info?.editors ?? []) names.set(editor.email, editor.name)
    for (const entry of entries) if (!names.get(entry.email)) names.set(entry.email, entry.name)
    names.delete(me)

    return [
      { id: ALL, label: 'همه' },
      ...(me ? [{ id: me, label: 'من' }] : []),
      ...[...names].map(([email, name]) => ({
        id: email,
        label: activityPerson(email, info, name)
      }))
    ]
  }, [entries, info])

  const modules = useMemo<ActivityChip[]>(
    () => [
      { id: ALL, label: 'همه' },
      ...[...new Set(entries.map(entry => entry.module))].map(id => ({
        id,
        label: moduleLabel(id)
      }))
    ],
    [entries]
  )

  const filtered = useMemo(
    () =>
      entries.filter(
        entry =>
          (person === ALL || entry.email === person) && (module === ALL || entry.module === module)
      ),
    [entries, module, person]
  )

  const choosePerson = useCallback((id: string) => {
    setPerson(id)
    setShown(ACTIVITY_PAGE_SIZE)
  }, [])

  const chooseModule = useCallback((id: string) => {
    setModule(id)
    setShown(ACTIVITY_PAGE_SIZE)
  }, [])

  return {
    info,
    entries,
    loading,
    sheetName: ACTIVITY_LOG_SHEET,
    total: filtered.length,
    visible: filtered.slice(0, shown),
    hasMore: filtered.length > shown,
    showMore: () => setShown(count => count + ACTIVITY_PAGE_SIZE),
    refresh: () => setReload(count => count + 1),
    people,
    person,
    choosePerson,
    modules,
    module,
    chooseModule,
    moduleLabel
  }
}
