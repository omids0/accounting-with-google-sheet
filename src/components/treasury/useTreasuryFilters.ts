import { useState, useCallback, useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { isConfigured } from '../../services/settings'
import { exportTreasuryCsv, exportTreasuryPdf, importTreasuryCsv } from '../../services/treasury'
import { buildSearchChip, compactFilterChips } from '../../utils/filterChips'

export function useTreasuryFilters(
  active: boolean,
  onReauth: (() => void) | undefined,
  refreshTreasury: () => void,
  loading: boolean,
  priceLoading: boolean,
  openCreateForm: () => void,
  searchQuery: string,
  setSearchQuery: (value: string) => void
) {
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftSearch, setDraftSearch] = useState('')

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportTreasuryCsv,
      exportPdfFn: exportTreasuryPdf,
      importFn: importTreasuryCsv,
      onComplete: refreshTreasury,
      onReauth
    })

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setFilterModalOpen(true)
  }, [searchQuery])

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات صندوقچه',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onFilter: openFilterModal,
        onRefresh: refreshTreasury,
        refreshDisabled: loading || priceLoading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      openFilterModal,
      refreshTreasury,
      loading,
      priceLoading,
      handleImport,
      handleExport,
      handleExportPdf,
      openCreateForm
    ]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  const filterChips = useMemo(
    () => compactFilterChips([buildSearchChip(searchQuery, () => setSearchQuery(''))]),
    [searchQuery, setSearchQuery]
  )

  return {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    openFilterModal,
    filterChips,
    importExportConfirmModal
  }
}
