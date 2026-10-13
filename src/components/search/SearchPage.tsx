import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import SearchResultGroup from './SearchResultGroup'
import SearchSuggestions from './SearchSuggestions'
import { useGlobalSearch } from './useGlobalSearch'
import { formatPersianNumber } from '../../utils/formatMoney'
import type { SearchFocusState } from '../layout/HeaderSearch'
import PageSearchInput from '../PageSearchInput'
import SearchEmptyState from '../SearchEmptyState'
import ToggleChipGroup from '../ToggleChipGroup'
import { calmEmptyClass } from '../ui/calmListStyles'
import { searchBarClass, searchChipsClass, searchPageClass } from '../ui/searchStyles'

/** «جستجو»: one field over every module's local data, results grouped by module. */
export default function SearchPage() {
  const search = useGlobalSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const focusRequest = (useLocation().state as SearchFocusState | null)?.focusSearch

  // On open, and again for the header ⌕, `/` or Ctrl+K while the page is already open.
  useEffect(() => {
    inputRef.current?.focus()
  }, [focusRequest])

  const { results, visibleGroups } = search
  const searching = !!search.deferredQuery.trim()
  const activeChip = results.groups.some(group => group.id === search.group) ? search.group : 'all'
  const chipOptions = [
    { id: 'all', label: `همه ${formatPersianNumber(results.total)}` },
    ...results.groups.map(group => ({
      id: group.id,
      label: `${group.label} ${formatPersianNumber(group.total)}`
    }))
  ]

  return (
    <div className={searchPageClass}>
      <div className={searchBarClass}>
        <PageSearchInput
          value={search.query}
          onChange={search.setQuery}
          placeholder="جستجو در همه‌ی بخش‌ها"
          inputRef={inputRef}
          onSubmit={search.remember}
        />
      </div>

      {!searching ? (
        <SearchSuggestions
          recent={search.recent}
          people={search.suggestions.people}
          months={search.suggestions.months}
          onPick={search.setQuery}
        />
      ) : search.loading && !results.total ? (
        <p className={calmEmptyClass}>در حال بارگذاری…</p>
      ) : !results.total ? (
        <SearchEmptyState />
      ) : (
        <>
          <div className={searchChipsClass}>
            <ToggleChipGroup
              ariaLabel="بخش"
              options={chipOptions}
              selected={{ [activeChip]: true }}
              onToggle={id => search.setGroup(id as typeof search.group)}
            />
          </div>
          <p className="sr-only" role="status">
            {`${formatPersianNumber(results.total)} نتیجه`}
          </p>
          {visibleGroups.map(group => (
            <SearchResultGroup
              key={group.id}
              group={group}
              onOpen={search.openEntry}
              onMore={search.showMore}
            />
          ))}
        </>
      )}
    </div>
  )
}
