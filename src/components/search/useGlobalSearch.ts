import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { searchEntryPath } from './searchTargets'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  SEARCH_GROUP_LIMIT,
  searchEntries,
  type SearchEntry,
  type SearchGroupId
} from '../../services/globalSearch'
import { loadSearchSources } from '../../services/globalSearchData'
import { buildSearchEntries, recentMonthLabels } from '../../services/globalSearchEntries'
import { getRecentSearches, saveRecentSearch } from '../../services/searchRecent'
import { getSettings } from '../../services/settings'

export type SearchGroupFilter = SearchGroupId | 'all'

/** The last query of this session, restored when coming back from a result. */
let sessionQuery = ''

const SUGGESTED_PEOPLE = 4

const SUGGESTED_MONTHS = 3

function useSearchEntries() {
  const dataRevision = useDataRefresh()
  const [entries, setEntries] = useState<SearchEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const settings = getSettings()
    let cancelled = false

    if (!settings?.spreadsheetId) {
      setLoading(false)

      return
    }

    loadSearchSources(settings)
      .then(sources => {
        if (!cancelled) setEntries(buildSearchEntries(sources))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataRevision])

  return { entries, loading }
}

/** State of the «جستجو» page: query, grouped results, chip filter and suggestions. */
export function useGlobalSearch() {
  const navigate = useNavigate()
  const spreadsheetId = getSettings()?.spreadsheetId
  const { entries, loading } = useSearchEntries()
  const [query, setQueryState] = useState(sessionQuery)
  const [group, setGroup] = useState<SearchGroupFilter>('all')
  const [limits, setLimits] = useState<Partial<Record<SearchGroupId, number>>>({})
  const [recent, setRecent] = useState(() => getRecentSearches(spreadsheetId))
  const deferredQuery = useDeferredValue(query)

  const setQuery = useCallback((value: string) => {
    sessionQuery = value
    setQueryState(value)
    setLimits({})
    setGroup('all')
  }, [])

  const results = useMemo(
    () => searchEntries(entries, deferredQuery, limits),
    [entries, deferredQuery, limits]
  )

  const visibleGroups = useMemo(() => {
    const selected = results.groups.filter(item => item.id === group)

    return selected.length ? selected : results.groups
  }, [results.groups, group])

  const suggestions = useMemo(
    () => ({
      people: entries
        .filter(entry => entry.group === 'counterparties' && entry.title !== '—')
        .slice(0, SUGGESTED_PEOPLE)
        .map(entry => entry.title),
      months: recentMonthLabels(entries, SUGGESTED_MONTHS)
    }),
    [entries]
  )

  const remember = useCallback(() => {
    if (query.trim()) setRecent(saveRecentSearch(spreadsheetId, query))
  }, [query, spreadsheetId])

  const showMore = useCallback((id: SearchGroupId) => {
    setLimits(current => ({
      ...current,
      [id]: (current[id] ?? SEARCH_GROUP_LIMIT) + SEARCH_GROUP_LIMIT
    }))
  }, [])

  const openEntry = useCallback(
    (entry: SearchEntry) => {
      remember()
      navigate(searchEntryPath(entry), {
        state: entry.group === 'vehicles' ? { title: entry.title } : undefined
      })
    },
    [navigate, remember]
  )

  return {
    query,
    setQuery,
    deferredQuery,
    loading,
    results,
    visibleGroups,
    group,
    setGroup,
    showMore,
    openEntry,
    remember,
    recent,
    suggestions
  }
}
