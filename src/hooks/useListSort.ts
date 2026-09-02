import { useCallback, useMemo, useState } from 'react'

import { buildSortChip, compactFilterChips } from '../utils/filterChips'

export type SortDirection = 'asc' | 'desc'

export type ListSortOption<T extends string> = {
  id: T
  label: string
  defaultDirection: SortDirection
}

type UseListSortOptions<T extends string, Item> = {
  options: ListSortOption<T>[]
  defaultSort: T
  compare: (a: Item, b: Item, sort: T, direction: SortDirection) => number
}

export function useListSort<T extends string, Item>({
  options,
  defaultSort,
  compare
}: UseListSortOptions<T, Item>) {
  const defaultOption = options.find(option => option.id === defaultSort) ?? options[0]

  const [sortId, setSortId] = useState<T>(defaultSort)

  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultOption.defaultDirection)

  const [draftSortId, setDraftSortId] = useState<T>(defaultSort)

  const [draftSortDirection, setDraftSortDirection] = useState<SortDirection>(
    defaultOption.defaultDirection
  )

  const isDefaultSort = sortId === defaultSort && sortDirection === defaultOption.defaultDirection

  const sortItems = useCallback(
    (items: Item[]): Item[] => [...items].sort((a, b) => compare(a, b, sortId, sortDirection)),
    [compare, sortId, sortDirection]
  )

  const syncDraftFromApplied = useCallback(() => {
    setDraftSortId(sortId)
    setDraftSortDirection(sortDirection)
  }, [sortId, sortDirection])

  const applyDraftSort = useCallback(() => {
    setSortId(draftSortId)
    setSortDirection(draftSortDirection)
  }, [draftSortId, draftSortDirection])

  const clearDraftSort = useCallback(() => {
    setDraftSortId(defaultSort)
    setDraftSortDirection(defaultOption.defaultDirection)
  }, [defaultSort, defaultOption.defaultDirection])

  const resetSort = useCallback(() => {
    setSortId(defaultSort)
    setSortDirection(defaultOption.defaultDirection)
  }, [defaultSort, defaultOption.defaultDirection])

  const sortChip = useMemo(() => {
    if (isDefaultSort) return null

    const option = options.find(item => item.id === sortId)

    const directionLabel = sortDirection === 'asc' ? 'صعودی' : 'نزولی'

    return buildSortChip(`${option?.label ?? sortId} (${directionLabel})`, resetSort)
  }, [isDefaultSort, options, sortId, sortDirection, resetSort])

  const sortChips = useMemo(() => compactFilterChips([sortChip]), [sortChip])

  return {
    sortOptions: options,
    sortId,
    sortDirection,
    draftSortId,
    draftSortDirection,
    setDraftSortId,
    setDraftSortDirection,
    sortItems,
    isDefaultSort,
    syncDraftFromApplied,
    applyDraftSort,
    clearDraftSort,
    resetSort,
    sortChip,
    sortChips
  }
}
