import { useState, useCallback, useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import type { PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { isConfigured } from '../../services/settings'
import { exportTreasuryCsv, exportTreasuryPdf, importTreasuryCsv } from '../../services/treasury'
import { buildSearchChip, compactFilterChips } from '../../utils/filterChips'
import SpeedDialIcon from '../SpeedDialIcon'

/** «هدف تازه» right after «ثبت خرید»: a second header pill on desktop. */
function withGoalAction(
  actions: PageSpeedDialAction[],
  onAddGoal: (() => void) | undefined
): PageSpeedDialAction[] {
  if (!onAddGoal) return actions

  const [add, ...rest] = actions

  return [
    add,
    {
      id: 'add-goal',
      label: 'هدف پس‌انداز تازه',
      headerLabel: '+ هدف تازه',
      icon: <SpeedDialIcon name="add" />,
      onClick: onAddGoal
    },
    ...rest
  ]
}

export function useTreasuryFilters(
  active: boolean,
  refreshTreasury: () => void,
  loading: boolean,
  priceLoading: boolean,
  openCreateForm: () => void,
  searchQuery: string,
  setSearchQuery: (value: string) => void,
  openGoalForm?: () => void
) {
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftSearch, setDraftSearch] = useState('')

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportTreasuryCsv,
      exportPdfFn: exportTreasuryPdf,
      importFn: importTreasuryCsv,
      onComplete: refreshTreasury
    })

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setFilterModalOpen(true)
  }, [searchQuery])

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات صندوقچه',
      actions: withGoalAction(
        createPageSpeedDialActions({
          onAdd: () => openCreateForm(),
          addLabel: 'ثبت خرید',
          onFilter: openFilterModal,
          onRefresh: refreshTreasury,
          refreshDisabled: loading || priceLoading,
          onImport: handleImport,
          onExport: handleExport,
          onExportPdf: handleExportPdf
        }),
        openGoalForm
      )
    }),
    [
      openFilterModal,
      refreshTreasury,
      loading,
      priceLoading,
      handleImport,
      handleExport,
      handleExportPdf,
      openCreateForm,
      openGoalForm
    ]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  const filterChips = useMemo(
    () => compactFilterChips([buildSearchChip(searchQuery, () => setSearchQuery(''))]),
    [searchQuery, setSearchQuery]
  )

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
  }, [setSearchQuery])

  return {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    openFilterModal,
    filterChips,
    clearAllFilters,
    importExportConfirmModal
  }
}
