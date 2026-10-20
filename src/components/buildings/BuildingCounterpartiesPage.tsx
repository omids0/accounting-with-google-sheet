import { useMemo, useState } from 'react'

import BuildingReadOnly from './BuildingReadOnly'
import {
  filterPersons,
  PERSON_CHIPS,
  personChipCounts,
  personLabels,
  type PersonChip
} from './counterpartyRows'
import FilterChipBar from './FilterChipBar'
import { useStayUnits } from './useStayUnits'
import CounterpartiesPage from '../counterparties/CounterpartiesPage'
import type { CounterpartiesScope } from '../counterparties/types'
import { useCounterpartyList } from '../counterparties/useCounterpartyList'

/**
 * «طرف حساب‌ها» of a building: the app's counterparties page with chips «همه | ساکنان |
 * پیمانکاران | مدیر» and a role line on each person, taken from the residents tab and the `me`
 * flag. The form has the «من» switch. Editing needs `people`.
 */
export default function BuildingCounterpartiesPage({ active = true }: { active?: boolean }) {
  const [chip, setChip] = useState<PersonChip>('all')
  const { stays, units } = useStayUnits()
  const [persons] = useCounterpartyList()

  const scope = useMemo<CounterpartiesScope>(
    () => ({
      header: items => {
        const counts = personChipCounts(items, stays)

        return (
          <FilterChipBar
            ariaLabel="نقش طرف حساب"
            value={chip}
            onChange={setChip}
            options={PERSON_CHIPS.map(option => ({ ...option, count: counts[option.value] }))}
          />
        )
      },
      filter: items => filterPersons(items, stays, chip),
      labels: personLabels(persons, stays, units)
    }),
    [chip, stays, units, persons]
  )

  return (
    <BuildingReadOnly permission="people">
      <CounterpartiesPage active={active} scope={scope} />
    </BuildingReadOnly>
  )
}
