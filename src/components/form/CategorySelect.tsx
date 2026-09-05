import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import {
  categorySelectLeadingClass,
  categorySelectPlaceholderClass,
  categorySelectRootClass,
  categorySelectSpinnerClass,
  categorySelectTriggerClass,
  customSelectChevronClass,
  customSelectTriggerClass,
  customSelectTriggerStateClass,
  customSelectValueClass
} from '../ui/formControlStyles'
import CategorySelectPanel from './categorySelect/CategorySelectPanel'
import CategorySelectSheet from './categorySelect/CategorySelectSheet'
import {
  useCategorySelectActions,
  type CategorySelectProps
} from './categorySelect/useCategorySelectActions'

export type { CategorySelectProps } from './categorySelect/useCategorySelectActions'

export default function CategorySelect({
  value,
  onChange,
  categories,
  formId,
  categoryScope,
  onCategoriesChange,
  disabled = false,
  'aria-label': ariaLabel = 'دسته‌بندی',
  id
}: CategorySelectProps) {
  const [open, setOpen] = useState(false)

  const [saving, setSaving] = useState(false)

  const [manageMode, setManageMode] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')

  const [editingCategory, setEditingCategory] = useState<string | null>(null)

  const [editText, setEditText] = useState('')

  const [newCategory, setNewCategory] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const addInputRef = useRef<HTMLInputElement>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const hasValue = Boolean(value)

  const showSearch = categories.length > 3

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return categories

    return categories.filter(category => category.toLowerCase().includes(query))
  }, [categories, searchQuery])

  const { handleSaveEdit, handleDelete, handleAdd } = useCategorySelectActions({
    categories,
    formId,
    categoryScope,
    onCategoriesChange,
    onChange,
    value,
    setSaving
  })

  const resetTransientState = useCallback(() => {
    setManageMode(false)
    setSearchQuery('')
    setEditingCategory(null)
    setEditText('')
    setConfirmDelete(null)
  }, [])

  const handleClose = useCallback(() => {
    if (saving) return

    if (editingCategory) {
      setEditingCategory(null)
      setEditText('')

      return
    }

    if (confirmDelete) {
      setConfirmDelete(null)

      return
    }

    if (manageMode) {
      setManageMode(false)

      return
    }

    setOpen(false)
    resetTransientState()
  }, [confirmDelete, editingCategory, manageMode, resetTransientState, saving])

  useEffect(() => {
    if (!open) return

    const focusTimer = window.setTimeout(() => {
      if (manageMode) {
        addInputRef.current?.focus()

        return
      }

      if (showSearch) {
        searchInputRef.current?.focus()
      }
    }, 50)

    return () => {
      window.clearTimeout(focusTimer)
    }
  }, [manageMode, open, showSearch])

  const startEdit = (category: string) => {
    setEditingCategory(category)
    setEditText(category)
    setConfirmDelete(null)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditText('')
  }

  const handleSelect = (category: string) => {
    if (saving || editingCategory || confirmDelete) return
    if (manageMode) return
    onChange(category)
    setOpen(false)
    resetTransientState()
  }

  const sheetTitle = manageMode ? 'مدیریت دسته‌ها' : ariaLabel

  return (
    <div
      className={categorySelectRootClass({ open, disabled, saving })}
      data-open={open || undefined}
    >
      <button
        id={id}
        type="button"
        className={cn(
          customSelectTriggerClass,
          categorySelectTriggerClass,
          customSelectTriggerStateClass({ open, disabled: disabled || saving })
        )}
        onClick={() => !disabled && !saving && setOpen(true)}
        disabled={disabled || saving}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={categorySelectLeadingClass} aria-hidden="true">
          <AppIcon name="folder" size={16} strokeWidth={2} />
        </span>
        <span className={cn(customSelectValueClass, !hasValue && categorySelectPlaceholderClass)}>
          {hasValue ? value : 'انتخاب دسته‌بندی'}
        </span>
        {saving ? (
          <span className={cn('spinner', categorySelectSpinnerClass)} aria-hidden="true" />
        ) : (
          <AppIcon
            name="chevron-down"
            size={12}
            strokeWidth={2.5}
            className={customSelectChevronClass(open)}
            aria-hidden
          />
        )}
      </button>

      <CategorySelectSheet
        open={open}
        title={sheetTitle}
        manageMode={manageMode}
        blocked={saving}
        onClose={handleClose}
        onBackFromManage={() => {
          setManageMode(false)
          setEditingCategory(null)
          setConfirmDelete(null)
        }}
      >
        <CategorySelectPanel
          ariaLabel={ariaLabel}
          categories={categories}
          filteredCategories={filteredCategories}
          value={value}
          saving={saving}
          manageMode={manageMode}
          showSearch={showSearch}
          searchQuery={searchQuery}
          editingCategory={editingCategory}
          confirmDelete={confirmDelete}
          editText={editText}
          newCategory={newCategory}
          addInputRef={addInputRef}
          searchInputRef={searchInputRef}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onNewCategoryChange={setNewCategory}
          onAdd={() => handleAdd(newCategory, setNewCategory, setSearchQuery)}
          onSelect={handleSelect}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onEditTextChange={setEditText}
          onSaveEdit={oldName => handleSaveEdit(oldName, editText, cancelEdit)}
          onConfirmDelete={category => {
            setConfirmDelete(category)
            setEditingCategory(null)
          }}
          onCancelDelete={() => setConfirmDelete(null)}
          onDelete={category => handleDelete(category, setConfirmDelete)}
          onOpenManageMode={() => setManageMode(true)}
        />
      </CategorySelectSheet>
    </div>
  )
}
