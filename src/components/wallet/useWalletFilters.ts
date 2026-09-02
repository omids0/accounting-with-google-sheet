import { useState, useCallback, useMemo } from 'react'

import type { WalletAccountWithRow } from './types'
import { buildSearchChip, compactFilterChips } from '../../utils/filterChips'
import { matchSearch } from '../../utils/search'

export function useWalletFilters(items: WalletAccountWithRow[]) {
  const [searchQuery, setSearchQuery] = useState('')

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftSearch, setDraftSearch] = useState('')

  const filteredItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.balance - a.balance)

    if (!searchQuery.trim()) return sorted

    return sorted.filter(item => matchSearch(searchQuery, item.title, item.note, item.balance))
  }, [items, searchQuery])

  const filterChips = useMemo(
    () => compactFilterChips([buildSearchChip(searchQuery, () => setSearchQuery(''))]),
    [searchQuery]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setFilterModalOpen(true)
  }, [searchQuery])

  const applyDraftFilters = () => {
    setSearchQuery(draftSearch)
    setFilterModalOpen(false)
  }

  const clearDraftFilters = () => {
    setDraftSearch('')
  }

  return {
    searchQuery,
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    filteredItems,
    filterChips,
    openFilterModal,
    applyDraftFilters,
    clearDraftFilters
  }
}
