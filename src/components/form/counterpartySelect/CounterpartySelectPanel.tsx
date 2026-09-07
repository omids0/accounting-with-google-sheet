import type { RefObject } from 'react'

import CounterpartySelectItem from './CounterpartySelectItem'
import type { CounterpartySelectAllOption } from './useCounterpartySelectActions'
import { useDragReorder } from '../../../hooks/useDragReorder'
import AppIcon from '../../AppIcon'
import type { CounterpartyWithRow } from '../../counterparties/types'
import {
  categorySelectAddClass,
  categorySelectAddRowClass,
  categorySelectEmptyClass,
  categorySelectFooterBtnClass,
  categorySelectFooterClass,
  categorySelectItemClass,
  categorySelectListClass,
  categorySelectOptionBtnClass,
  categorySelectOptionCheckClass,
  categorySelectOptionLabelClass,
  categorySelectPanelClass,
  categorySelectSearchClass,
  categorySelectSearchClearClass,
  categorySelectSearchInputClass
} from '../../ui/formControlStyles'

interface CounterpartySelectPanelProps {
  ariaLabel: string
  items: CounterpartyWithRow[]
  filteredItems: CounterpartyWithRow[]
  value: string
  saving: boolean
  manageMode: boolean
  allowManage: boolean
  allOption?: CounterpartySelectAllOption
  showSearch: boolean
  searchQuery: string
  confirmDelete: CounterpartyWithRow | null
  searchInputRef: RefObject<HTMLInputElement>
  onSearchChange: (query: string) => void
  onClearSearch: () => void
  onSelect: (name: string) => void
  onOpenCreateForm: () => void
  onStartEdit: (item: CounterpartyWithRow) => void
  onConfirmDelete: (item: CounterpartyWithRow) => void
  onCancelDelete: () => void
  onDelete: (item: CounterpartyWithRow) => void
  onOpenManageMode: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export default function CounterpartySelectPanel({
  ariaLabel,
  items,
  filteredItems,
  value,
  saving,
  manageMode,
  allowManage,
  allOption,
  showSearch,
  searchQuery,
  confirmDelete,
  searchInputRef,
  onSearchChange,
  onClearSearch,
  onSelect,
  onOpenCreateForm,
  onStartEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onOpenManageMode,
  onReorder
}: CounterpartySelectPanelProps) {
  const canReorder = manageMode && !searchQuery.trim() && !confirmDelete && items.length > 1

  const { draggingIndex, getItemDragProps, getHandleProps } = useDragReorder({
    disabled: !canReorder || saving,
    onReorder
  })

  const showAllOption =
    allOption && allOption.label.toLowerCase().includes(searchQuery.trim().toLowerCase())

  const listIsEmpty = !showAllOption && filteredItems.length === 0

  return (
    <div className={categorySelectPanelClass}>
      {showSearch && (
        <div className={categorySelectSearchClass}>
          <AppIcon name="search" size={15} strokeWidth={2} />
          <input
            ref={searchInputRef}
            type="search"
            className={categorySelectSearchInputClass}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="جستجو در طرف حساب‌ها..."
            disabled={saving}
            aria-label="جستجوی طرف حساب"
          />
          {searchQuery && (
            <button
              type="button"
              className={categorySelectSearchClearClass}
              onClick={onClearSearch}
              aria-label="پاک کردن جستجو"
            >
              <AppIcon name="close" size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {manageMode && allowManage && (
        <div className={categorySelectAddClass}>
          <div className={categorySelectAddRowClass}>
            <button
              type="button"
              className={categorySelectFooterBtnClass}
              onClick={onOpenCreateForm}
              disabled={saving}
            >
              <AppIcon name="add" size={18} strokeWidth={2.5} />
              ثبت طرف حساب جدید
            </button>
          </div>
        </div>
      )}

      <div className={categorySelectListClass} role="listbox" aria-label={ariaLabel}>
        {showAllOption && (
          <div className={categorySelectItemClass({ selected: value === allOption.value })}>
            <button
              type="button"
              role="option"
              aria-selected={value === allOption.value}
              className={categorySelectOptionBtnClass}
              onClick={() => onSelect(allOption.value)}
              disabled={saving || manageMode}
            >
              <span className={categorySelectOptionCheckClass} aria-hidden="true">
                {value === allOption.value && <AppIcon name="check" size={14} strokeWidth={2.5} />}
              </span>
              <span className={categorySelectOptionLabelClass(value === allOption.value)}>
                {allOption.label}
              </span>
            </button>
          </div>
        )}

        {listIsEmpty ? (
          <div className={categorySelectEmptyClass}>
            {searchQuery.trim() ? 'طرف حسابی با این نام پیدا نشد' : 'هنوز طرف حسابی ثبت نشده'}
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <CounterpartySelectItem
              key={item.id}
              item={item}
              value={value}
              manageMode={manageMode}
              saving={saving}
              confirmDelete={confirmDelete}
              canReorder={canReorder}
              dragging={draggingIndex === index}
              dragProps={getItemDragProps(index)}
              handleProps={getHandleProps(index)}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {!manageMode && allowManage && (
        <div className={categorySelectFooterClass}>
          <button
            type="button"
            className={categorySelectFooterBtnClass}
            onClick={onOpenCreateForm}
            disabled={saving}
          >
            <AppIcon name="add" size={15} strokeWidth={2} />
            ثبت طرف حساب جدید
          </button>
          <button
            type="button"
            className={categorySelectFooterBtnClass}
            onClick={onOpenManageMode}
            disabled={saving}
          >
            <AppIcon name="settings" size={15} strokeWidth={2} />
            مدیریت طرف حساب‌ها
          </button>
        </div>
      )}
    </div>
  )
}
