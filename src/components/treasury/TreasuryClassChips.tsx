import { VAULT_ASSET_CLASSES } from '../../services/treasuryCatalog'
import type { TreasuryClassFilter } from '../../services/treasuryClassPref'
import type { VaultClassCounts } from '../../services/treasuryHoldings'
import ToggleChipGroup from '../ToggleChipGroup'
import { treasuryClassChipsClass } from '../ui/treasuryReceivableStyles'

function chipLabel(label: string, count: number): string {
  return `${label} ${count.toLocaleString('fa-IR')}`
}

/**
 * «همه ۱۲ · طلا ۵ · ارز ۲ …»: one chip per class that has holdings (net quantity > 0),
 * plus «هدف‌ها» once savings goals exist (round 6, Task B3 passes `goalsCount`).
 */
export default function TreasuryClassChips({
  counts,
  goalsCount = 0,
  archivedGoalsCount = 0,
  value,
  onChange
}: {
  counts: VaultClassCounts
  /** Active and reached goals: they also count under «همه». */
  goalsCount?: number
  /** Archived goals: listed only under «هدف‌ها», which stays while any goal exists. */
  archivedGoalsCount?: number
  value: TreasuryClassFilter
  onChange: (value: TreasuryClassFilter) => void
}) {
  const options = [
    { id: 'all', label: chipLabel('همه', counts.all + goalsCount) },
    ...VAULT_ASSET_CLASSES.filter(({ id }) => counts[id] > 0).map(({ id, label }) => ({
      id,
      label: chipLabel(label, counts[id])
    })),
    ...(goalsCount + archivedGoalsCount > 0
      ? [{ id: 'goals', label: chipLabel('هدف‌ها', goalsCount + archivedGoalsCount) }]
      : [])
  ]

  return (
    <div className={treasuryClassChipsClass}>
      <ToggleChipGroup
        ariaLabel="کلاس دارایی"
        options={options}
        selected={{ [value]: true }}
        onToggle={id => onChange(id as TreasuryClassFilter)}
      />
    </div>
  )
}
