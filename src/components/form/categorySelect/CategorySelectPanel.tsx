import type { RefObject } from 'react'

import CategorySelectItem from './CategorySelectItem'
import AppIcon from '../../AppIcon'
import {
  categorySelectAddBtnClass,
  categorySelectAddClass,
  categorySelectAddInputClass,
  categorySelectAddRowClass,
  categorySelectCountClass,
  categorySelectEmptyClass,
  categorySelectFooterBtnClass,
  categorySelectFooterClass,
  categorySelectHeaderClass,
  categorySelectHeaderTitleClass,
  categorySelectListClass,
  categorySelectManageBtnClass,
  categorySelectPanelClass,
  categorySelectSearchClass,
  categorySelectSearchClearClass,
  categorySelectSearchInputClass
} from '../../ui/formControlStyles'

interface CategorySelectPanelProps {
  ariaLabel: string
  categories: string[]
  filteredCategories: string[]
  value: string
  saving: boolean
  manageMode: boolean
  showSearch: boolean
  searchQuery: string
  editingCategory: string | null
  confirmDelete: string | null
  editText: string
  newCategory: string
  addInputRef: RefObject<HTMLInputElement>
  searchInputRef: RefObject<HTMLInputElement>
  onToggleManageMode: () => void
  onSearchChange: (query: string) => void
  onClearSearch: () => void
  onNewCategoryChange: (value: string) => void
  onAdd: () => void
  onSelect: (category: string) => void
  onStartEdit: (category: string) => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
  onSaveEdit: (oldName: string) => void
  onConfirmDelete: (category: string) => void
  onCancelDelete: () => void
  onDelete: (category: string) => void
  onOpenManageMode: () => void
}

export default function CategorySelectPanel({
  ariaLabel,
  categories,
  filteredCategories,
  value,
  saving,
  manageMode,
  showSearch,
  searchQuery,
  editingCategory,
  confirmDelete,
  editText,
  newCategory,
  addInputRef,
  searchInputRef,
  onToggleManageMode,
  onSearchChange,
  onClearSearch,
  onNewCategoryChange,
  onAdd,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onEditTextChange,
  onSaveEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onOpenManageMode
}: CategorySelectPanelProps) {
  return (
    <div className={categorySelectPanelClass}>
      <div className={categorySelectHeaderClass}>
        <div className={categorySelectHeaderTitleClass}>
          <span>{ariaLabel}</span>
          <span className={categorySelectCountClass}>{categories.length}</span>
        </div>
        <button
          type="button"
          className={categorySelectManageBtnClass(manageMode)}
          onClick={onToggleManageMode}
          disabled={saving}
          aria-pressed={manageMode}
        >
          <AppIcon name="settings" size={14} strokeWidth={2} />
          {manageMode ? 'اتمام' : 'مدیریت'}
        </button>
      </div>

      {showSearch && (
        <div className={categorySelectSearchClass}>
          <AppIcon name="search" size={15} strokeWidth={2} />
          <input
            ref={searchInputRef}
            type="search"
            className={categorySelectSearchInputClass}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="جستجو در دسته‌ها..."
            disabled={saving}
            aria-label="جستجوی دسته‌بندی"
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
            <input
              ref={addInputRef}
              type="text"
              className={categorySelectAddInputClass}
              value={newCategory}
              onChange={e => onNewCategoryChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onAdd()
                }
              }}
              placeholder="نام دسته جدید..."
              disabled={saving}
              aria-label="دسته‌بندی جدید"
            />
            <button
              type="button"
              className={categorySelectAddBtnClass}
              onClick={onAdd}
              disabled={saving || !newCategory.trim()}
              aria-label="افزودن دسته"
            >
              <AppIcon name="add" size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      <div className={categorySelectListClass} role="listbox" aria-label={ariaLabel}>
        {filteredCategories.length === 0 ? (
          <div className={categorySelectEmptyClass}>
            {searchQuery.trim() ? 'دسته‌ای با این نام پیدا نشد' : 'هنوز دسته‌بندی ثبت نشده'}
          </div>
        ) : (
          filteredCategories.map(category => (
            <CategorySelectItem
              key={category}
              category={category}
              value={value}
              manageMode={manageMode}
              saving={saving}
              editingCategory={editingCategory}
              confirmDelete={confirmDelete}
              editText={editText}
              categoriesCount={categories.length}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onEditTextChange={onEditTextChange}
              onSaveEdit={onSaveEdit}
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
            onClick={onOpenManageMode}
            disabled={saving}
          >
            <AppIcon name="add" size={14} strokeWidth={2.5} />
            افزودن یا ویرایش دسته‌ها
          </button>
        </div>
      )}
    </div>
  )
}
