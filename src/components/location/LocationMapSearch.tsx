import { useEffect, useState } from 'react'

import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { CounterpartyLocation } from '../../types/counterparties'
import { searchGeocode, type GeocodeSearchResult } from '../../utils/reverseGeocode'
import AppIcon from '../AppIcon'
import {
  locationMapSearchInputClass,
  locationMapSearchResultsClass,
  locationMapSearchWrapClass
} from './locationMapStyles'

type LocationMapSearchProps = {
  onSelect: (location: CounterpartyLocation, label: string) => void
  disabled?: boolean
}

export default function LocationMapSearch({ onSelect, disabled }: LocationMapSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debouncedQuery = useDebouncedValue(query.trim(), 400)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    let cancelled = false

    setSearching(true)

    void searchGeocode(debouncedQuery)
      .then(nextResults => {
        if (!cancelled) setResults(nextResults)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const handleSelect = (result: GeocodeSearchResult) => {
    onSelect({ lat: result.lat, lng: result.lng }, result.label)
    setQuery(result.label)
    setResults([])
  }

  const showResults = results.length > 0 && query.trim().length >= 2

  return (
    <div className={`${locationMapSearchWrapClass} relative grid gap-1`}>
      <div className="relative">
        <span
          className="pointer-events-none absolute end-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-muted opacity-80"
          aria-hidden="true"
        >
          <AppIcon name="search" size={16} strokeWidth={2} />
        </span>
        <input
          type="search"
          className={locationMapSearchInputClass}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="جستجوی آدرس یا مکان..."
          aria-label="جستجوی آدرس یا مکان"
          disabled={disabled}
        />
        {query ? (
          <button
            type="button"
            className="absolute start-2 top-1/2 flex h-touch-min w-touch-min -translate-y-1/2 items-center justify-center rounded-full text-muted transition-[background] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
            onClick={() => {
              setQuery('')
              setResults([])
            }}
            aria-label="پاک کردن جستجو"
          >
            <AppIcon name="close" size={16} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {searching ? (
        <p className="px-1 text-[0.78rem] text-[color-mix(in_srgb,var(--text)_70%,transparent)]">
          در حال جستجو...
        </p>
      ) : null}

      {showResults ? (
        <div className={locationMapSearchResultsClass}>
          {results.map(result => (
            <button
              key={`${result.lat}-${result.lng}-${result.label}`}
              type="button"
              className="flex w-full items-start border-0 bg-transparent px-3 py-2.5 text-start text-[0.82rem] leading-[1.45] text-text transition-[background] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-inset"
              onClick={() => handleSelect(result)}
            >
              {result.label}
            </button>
          ))}
        </div>
      ) : null}

      {!searching && debouncedQuery.length >= 2 && results.length === 0 ? (
        <p className="px-1 text-[0.78rem] text-[color-mix(in_srgb,var(--text)_70%,transparent)]">
          نتیجه‌ای یافت نشد.
        </p>
      ) : null}
    </div>
  )
}
