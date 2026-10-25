import type { ReactNode } from 'react'

import ShowMoreFooter from './ShowMoreFooter'
import { useIncrementalList } from '../hooks/useIncrementalList'
import { listCountLabel } from '../utils/listCountLabel'
import { listCardsContainerClass } from './ui/featureCardStyles'

/**
 * A list of cards that renders 50 at a time with «نمایش بیشتر» (`useIncrementalList`). Totals,
 * exports and reminders keep reading the full `items` on the page; only the DOM is windowed.
 */
export default function IncrementalCardList<T>({
  items,
  getId,
  renderItem,
  resetKey,
  mustInclude,
  unit = 'مورد',
  className = listCardsContainerClass
}: {
  items: T[]
  getId: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
  /** The active filters: a new value starts over at the first 50. */
  resetKey: string
  /** Ids to keep rendered: the deep-link target (`?highlight=`), the expanded card. */
  mustInclude?: ReadonlyArray<string | null | undefined>
  unit?: string
  className?: string
}) {
  const { visible, remaining, nextStep, showMore } = useIncrementalList(items, {
    resetKey,
    mustInclude,
    getId
  })

  return (
    <>
      <div className={className}>{visible.map(renderItem)}</div>
      <ShowMoreFooter
        remaining={remaining}
        nextStep={nextStep}
        onShowMore={showMore}
        unit={unit}
        countLabel={listCountLabel(visible.length, items.length, unit)}
      />
    </>
  )
}
