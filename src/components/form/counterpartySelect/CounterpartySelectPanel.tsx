import type { RefObject } from 'react'

import CounterpartySelectItem from './CounterpartySelectItem'
import { useDragReorder } from '../../../hooks/useDragReorder'
import AppIcon from '../../AppIcon'
import type { CounterpartyWithRow } from '../../counterparties/types'
import {
  categorySelectAddClass,
  categorySelectAddRowClass,
  categorySelectEmptyClass,
  categorySelectFooterBtnClass,
  categorySelectFooterClass,
  categorySelectListClass,
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

      {manageMode && (
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
        {filteredItems.length === 0 ? (
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

      {!manageMode && (
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
