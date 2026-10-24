import type { useListFilters } from '../../hooks/useListFilters'
import ActiveFilterChips from '../ActiveFilterChips'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'

export type ListFilters = ReturnType<typeof useListFilters<unknown>>

/** The search of a building list: the filter sheet from `useListFilters` and its active chips. */
export default function BuildingListFilters({
  filters,
  placeholder
}: {
  filters: ListFilters
  placeholder: string
}) {
  return (
    <>
      <FilterModal
        open={filters.filterModalOpen}
        onClose={() => filters.setFilterModalOpen(false)}
        onApply={filters.applyFilters}
        onClear={filters.clearDraftFilters}
      >
        <PageFilterPanel
          search={filters.draftSearch}
          onSearchChange={filters.setDraftSearch}
          searchPlaceholder={placeholder}
        />
      </FilterModal>
      <ActiveFilterChips
        chips={filters.filterChips}
        onOpenFilters={filters.openFilterModal}
        onClearAll={filters.clearAllFilters}
        inHeader
      />
    </>
  )
}
