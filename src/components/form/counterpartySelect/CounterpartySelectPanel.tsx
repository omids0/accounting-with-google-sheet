import type { RefObject } from 'react'

import CounterpartySelectItem from './CounterpartySelectItem'
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
}

export default function CounterpartySelectPanel({
  ariaLabel,
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
  onOpenManageMode
}: CounterpartySelectPanelProps) {
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
          filteredItems.map(item => (
            <CounterpartySelectItem
              key={item.id}
              item={item}
              value={value}
              manageMode={manageMode}
              saving={saving}
              confirmDelete={confirmDelete}
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
