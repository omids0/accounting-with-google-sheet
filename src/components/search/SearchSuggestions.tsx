import AppIcon from '../AppIcon'
import CalmBlock from '../CalmBlock'
import { calmEmptyClass } from '../ui/calmListStyles'
import { searchSuggestChipClass, searchSuggestChipsClass } from '../ui/searchStyles'

function ChipRow({
  items,
  icon,
  label,
  onPick
}: {
  items: string[]
  icon: 'clock' | 'counterparties' | 'records'
  label: string
  onPick: (value: string) => void
}) {
  return (
    <div className={searchSuggestChipsClass} role="group" aria-label={label}>
      {items.map(item => (
        <button
          key={item}
          type="button"
          className={searchSuggestChipClass}
          onClick={() => onPick(item)}
        >
          <AppIcon name={icon} size={14} />
          <span className="truncate">{item}</span>
        </button>
      ))}
    </div>
  )
}

/** Under an empty input: the last searches, then people and months to start from. */
export default function SearchSuggestions({
  recent,
  people,
  months,
  onPick
}: {
  recent: string[]
  people: string[]
  months: string[]
  onPick: (value: string) => void
}) {
  const hasAny = recent.length + people.length + months.length > 0

  if (!hasAny) {
    return (
      <p className={calmEmptyClass}>
        نام، عنوان، شماره چک یا مبلغ را بنویسید؛ همه‌ی بخش‌ها با هم جستجو می‌شوند.
      </p>
    )
  }

  return (
    <>
      {recent.length ? (
        <CalmBlock title="جستجوهای اخیر">
          <ChipRow items={recent} icon="clock" label="جستجوهای اخیر" onPick={onPick} />
        </CalmBlock>
      ) : null}
      {people.length || months.length ? (
        <CalmBlock title="پیشنهاد">
          <div className="flex flex-col gap-2">
            {people.length ? (
              <ChipRow items={people} icon="counterparties" label="طرف حساب‌ها" onPick={onPick} />
            ) : null}
            {months.length ? (
              <ChipRow items={months} icon="records" label="ماه‌ها" onPick={onPick} />
            ) : null}
          </div>
        </CalmBlock>
      ) : null}
    </>
  )
}
