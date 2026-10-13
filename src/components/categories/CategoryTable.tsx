import { useMemo } from 'react'

import type { CategoryItem } from './useCategoriesPage'
import type { ManagedCategoryType } from '../../services/categoryManagePlan'
import { isOtherCategory } from '../../utils/categoryOrdering'
import { formatPersianNumber } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import CardEditButton from '../CardEditButton'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { categoryBadgeClass, categoryIconBtnClass } from '../ui/categoryPageStyles'
import { dataTableLinkClass } from '../ui/tableStyles'

interface CategoryTableProps {
  items: CategoryItem[]
  type: ManagedCategoryType
  /** Off while searching or saving. */
  canReorder: boolean
  /** Last movable position: «سایر» stays at the end. */
  lastMovable: number
  onReorder: (fromIndex: number, toIndex: number) => void
  onOpen: (name: string) => void
}

const count = (value: number) => formatPersianNumber(value)

/** Desktop (≥ 1280px): the same rows as a sortable table; the detail opens as a side panel. */
export default function CategoryTable({
  items,
  type,
  canReorder,
  lastMovable,
  onReorder,
  onOpen
}: CategoryTableProps) {
  const formType = type === 'income' || type === 'expense'

  const columns = useMemo<DataTableColumn<CategoryItem>[]>(() => {
    const name: DataTableColumn<CategoryItem> = {
      id: 'name',
      header: 'دسته',
      sortValue: item => item.name,
      cell: item => (
        <span className="inline-flex items-center gap-1.5">
          <button type="button" className={dataTableLinkClass} onClick={() => onOpen(item.name)}>
            {item.name}
          </button>
          {item.system ? <span className={categoryBadgeClass}>سیستمی</span> : null}
          {item.dormant ? <span className={categoryBadgeClass}>ادغام یا حذف؟</span> : null}
        </span>
      )
    }

    if (!formType) {
      return [
        name,
        {
          id: 'total',
          header: 'مورد',
          numeric: true,
          sortFirst: 'desc',
          sortValue: item => item.usage.total,
          cell: item => count(item.usage.total)
        }
      ]
    }

    const numeric = (
      id: string,
      header: string,
      get: (item: CategoryItem) => number
    ): DataTableColumn<CategoryItem> => ({
      id,
      header,
      numeric: true,
      sortFirst: 'desc',
      sortValue: get,
      cell: item => (get(item) ? count(get(item)) : '—')
    })

    return [
      name,
      numeric('subs', 'زیردسته', item => item.subcategories?.length ?? 0),
      numeric('month', 'تراکنش این ماه', item => item.usage.thisMonth),
      numeric('recent', 'در ۶ ماه', item => item.usage.recent),
      ...(type === 'expense' ? [numeric('budget', 'بودجه ماهانه', item => item.budget)] : [])
    ]
  }, [formType, onOpen, type])

  return (
    <DataTable
      label="دسته‌ها"
      rows={items}
      columns={columns}
      rowKey={item => item.name}
      isMuted={item => item.dormant}
      actions={item => {
        const movable = canReorder && !isOtherCategory(item.name)

        return (
          <>
            {movable ? (
              <>
                <button
                  type="button"
                  className={categoryIconBtnClass}
                  aria-label={`بالا بردن ${item.name}`}
                  disabled={item.index === 0}
                  onClick={() => onReorder(item.index, item.index - 1)}
                >
                  <AppIcon name="chevron-down" size={16} className="rotate-180" />
                </button>
                <button
                  type="button"
                  className={categoryIconBtnClass}
                  aria-label={`پایین بردن ${item.name}`}
                  disabled={item.index >= lastMovable}
                  onClick={() => onReorder(item.index, item.index + 1)}
                >
                  <AppIcon name="chevron-down" size={16} />
                </button>
              </>
            ) : null}
            <CardEditButton onClick={() => onOpen(item.name)} ariaLabel={`جزئیات ${item.name}`} />
          </>
        )
      }}
    />
  )
}
