import { useMemo, useState } from 'react'

import BuildingReadOnly from './BuildingReadOnly'
import FilterChipBar from './FilterChipBar'
import { dangChipCounts, DANG_CHIPS, filterDangs, type DangChip } from '../../services/buildingDang'
import { managerCreditorNames } from '../../services/buildingDashboard'
import { getManagedList, MANAGER_PAYER } from '../../services/buildingLists'
import { useCounterpartyList } from '../counterparties/useCounterpartyList'
import DangPage, { type DangPageScope } from '../dang/DangPage'

const BUILDING_DANG_EMPTY = {
  message: 'هنوز بدهی‌ای برای ساختمان ثبت نشده',
  description:
    'بدهی‌های ساختمان به مدیر، پیمانکار و دیگران را اینجا ثبت کن و هر پرداخت را علامت بزن تا مانده‌اش معلوم باشد.',
  actionLabel: 'ثبت بدهی ساختمان'
}

/**
 * «بدهی ساختمان»: the app's debt page with chips «باز | تسویه‌شده | به مدیر | پیمانکار». The
 * rows to the manager come from expenses the manager paid out of pocket; «تسویه» opens the settle
 * sheet with a fund account and writes one transfer «انتقال › بازپرداخت به <payer>», no second
 * expense. Read-only for a role without `record`.
 */
export default function BuildingDangPage({ active = true }: { active?: boolean }) {
  const [chip, setChip] = useState<DangChip>('open')
  const [persons] = useCounterpartyList()

  const managerNames = useMemo(
    () =>
      managerCreditorNames(
        getManagedList('EXPENSE_PAYERS').find(item => item.value === MANAGER_PAYER)?.label ?? '',
        persons
      ),
    [persons]
  )

  const scope = useMemo<DangPageScope>(
    () => ({
      header: items => {
        const counts = dangChipCounts(items, managerNames)

        return (
          <FilterChipBar
            ariaLabel="وضعیت بدهی"
            value={chip}
            onChange={setChip}
            options={DANG_CHIPS.map(option => ({ ...option, count: counts[option.value] }))}
          />
        )
      },
      filter: items => filterDangs(items, chip, managerNames),
      emptyCopy: BUILDING_DANG_EMPTY
    }),
    [chip, managerNames]
  )

  return (
    <BuildingReadOnly permission="record">
      <DangPage active={active} scope={scope} />
    </BuildingReadOnly>
  )
}
