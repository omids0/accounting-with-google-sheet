import EmptyState from './EmptyState'

/**
 * `filterNote` names a filter that may be what hides the rows («نوع چک: دریافتی»), and
 * `onClearFilter` lifts that one filter.
 */
export default function SearchEmptyState({
  filterNote,
  onClearFilter
}: {
  filterNote?: string
  onClearFilter?: () => void
}) {
  return (
    <EmptyState
      icon="search"
      message="نتیجه‌ای یافت نشد"
      description={filterNote}
      secondaryAction={
        filterNote && onClearFilter
          ? { label: 'برداشتن این فیلتر', onClick: onClearFilter }
          : undefined
      }
    />
  )
}
