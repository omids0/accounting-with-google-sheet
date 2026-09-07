import { useMemo } from 'react'

import CounterpartySelect from './CounterpartySelect'
import { counterpartiesFromFilterNames } from './counterpartySelect/counterpartyFilterItems'

const ALL_OPTION = { value: 'all', label: 'همه' }

interface CounterpartyFilterSelectProps {
  value: string
  onChange: (value: string) => void
  counterparties: string[]
  'aria-label'?: string
  className?: string
}

export default function CounterpartyFilterSelect({
  value,
  onChange,
  counterparties,
  'aria-label': ariaLabel = 'طرف حساب',
  className
}: CounterpartyFilterSelectProps) {
  const items = useMemo(() => counterpartiesFromFilterNames(counterparties), [counterparties])

  return (
    <CounterpartySelect
      value={value}
      onChange={onChange}
      counterparties={items}
      allOption={ALL_OPTION}
      allowManage={false}
      showSearchAlways
      placeholder="همه"
      aria-label={ariaLabel}
      className={className}
    />
  )
}
