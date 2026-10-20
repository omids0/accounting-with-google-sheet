import { useMemo } from 'react'

import CounterpartyCard from './CounterpartyCard'
import PhoneNumberLinks from './PhoneNumberLinks'
import type { CounterpartyWithRow } from './types'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { getCounterpartyFullName } from '../../services/counterparties'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { dateColumn, textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { listCardsContainerClass } from '../ui/featureCardStyles'
import { dataTableLinkClass } from '../ui/tableStyles'

type CounterpartyListProps = {
  items: CounterpartyWithRow[]
  filteredItems: CounterpartyWithRow[]
  /** Records per counterparty name («N تراکنش»); a name with none is simply absent. */
  recordCounts?: ReadonlyMap<string, number>
  /** Counterparty id to a short line under the name (a building's «پیمانکار», «ساکن · واحد ۳»). */
  labels?: ReadonlyMap<string, string>
  onView: (item: CounterpartyWithRow) => void
  onEdit: (item: CounterpartyWithRow) => void
  onDelete: (item: CounterpartyWithRow) => void
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
}

export default function CounterpartyList({
  items,
  filteredItems,
  recordCounts,
  labels,
  onView,
  onEdit,
  onDelete,
  onAdd
}: CounterpartyListProps) {
  const isDesktop = useIsDesktop()
  const columns = useMemo<DataTableColumn<CounterpartyWithRow>[]>(
    () => [
      {
        id: 'name',
        header: 'نام',
        sortValue: getCounterpartyFullName,
        cell: item => (
          <button type="button" className={dataTableLinkClass} onClick={() => onView(item)}>
            {getCounterpartyFullName(item) || '—'}
          </button>
        )
      },
      {
        id: 'phones',
        header: 'تلفن',
        cell: item => (item.phones.length ? <PhoneNumberLinks phones={item.phones} inline /> : '—')
      },
      ...(labels
        ? [textColumn<CounterpartyWithRow>('label', 'نقش', item => labels.get(item.id) ?? '')]
        : []),
      textColumn('address', 'آدرس', item => item.address),
      dateColumn('birth', 'تولد', item => item.birthDate),
      {
        id: 'accounts',
        header: 'حساب‌ها',
        numeric: true,
        sortValue: item => item.accounts.length,
        cell: item => item.accounts.length.toLocaleString('fa-IR')
      },
      {
        id: 'records',
        header: 'تراکنش',
        numeric: true,
        sortFirst: 'desc',
        sortValue: item => recordCounts?.get(getCounterpartyFullName(item)) ?? 0,
        cell: item =>
          (recordCounts?.get(getCounterpartyFullName(item)) ?? 0).toLocaleString('fa-IR')
      }
    ],
    [onView, recordCounts, labels]
  )

  if (items.length === 0) {
    return (
      <EmptyState
        icon="counterparties"
        description="افرادی که با آن‌ها حساب‌وکتاب داری را یک‌بار تعریف کن تا در طلب، بدهی و چک‌ها انتخابشان کنی."
        message="هنوز طرف حسابی ثبت نشده"
        action={onAdd ? { label: 'افزودن طرف حساب', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  if (isDesktop) {
    return (
      <DataTable
        label="طرف حساب‌ها"
        rows={filteredItems}
        columns={columns}
        rowKey={item => item.id}
        actions={item => (
          <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
        )}
      />
    )
  }

  return (
    <div className={listCardsContainerClass}>
      {filteredItems.map(item => (
        <CounterpartyCard
          key={item.id}
          item={item}
          recordCount={recordCounts?.get(getCounterpartyFullName(item))}
          label={labels?.get(item.id)}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
