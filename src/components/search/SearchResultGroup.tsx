import { SEARCH_GROUP_ICONS } from './searchTargets'
import type { SearchEntry, SearchGroupId, SearchGroupResult } from '../../services/globalSearch'
import { cn } from '../../utils/cn'
import { formatPersianNumber, formatSignedNumber } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import CalmBlock from '../CalmBlock'
import DayBadge from '../DayBadge'
import {
  calmBlockLinkClass,
  calmListClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'
import {
  searchAmountNegativeClass,
  searchRowButtonClass,
  searchRowTagClass
} from '../ui/searchStyles'

function SearchResultRow({ entry, onOpen }: { entry: SearchEntry; onOpen: () => void }) {
  return (
    <li className="border-t border-border first:border-t-0">
      <button type="button" className={searchRowButtonClass} onClick={onOpen}>
        {entry.date ? (
          <DayBadge date={entry.date} showMonth />
        ) : (
          <span className={searchRowTagClass} aria-hidden="true">
            <AppIcon name={SEARCH_GROUP_ICONS[entry.group]} size={17} />
          </span>
        )}
        <span className={calmRowMainClass}>
          <span className={calmRowTitleClass}>{entry.title}</span>
          {entry.subtitle ? <span className={calmRowSubClass}>{entry.subtitle}</span> : null}
        </span>
        {entry.amount != null ? (
          <span className={cn(calmRowEndClass, entry.amount < 0 && searchAmountNegativeClass)}>
            {formatSignedNumber(entry.amount)}
          </span>
        ) : null}
      </button>
    </li>
  )
}

/** One module's results: its rows (20 at a time) and «بیشتر» while more match. */
export default function SearchResultGroup({
  group,
  onOpen,
  onMore
}: {
  group: SearchGroupResult
  onOpen: (entry: SearchEntry) => void
  onMore: (id: SearchGroupId) => void
}) {
  const hidden = group.total - group.items.length

  return (
    <CalmBlock
      title={group.title}
      badge={<span className="text-muted">{formatPersianNumber(group.total)}</span>}
    >
      <ul className={calmListClass}>
        {group.items.map(entry => (
          <SearchResultRow
            key={`${entry.group}:${entry.id}`}
            entry={entry}
            onOpen={() => onOpen(entry)}
          />
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          className={cn(calmBlockLinkClass, 'self-start')}
          onClick={() => onMore(group.id)}
        >
          بیشتر ({formatPersianNumber(hidden)})
        </button>
      ) : null}
    </CalmBlock>
  )
}
