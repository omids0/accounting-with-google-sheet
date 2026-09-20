import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '../../utils/cn'
import { categorySelectRootClass } from '../ui/formControlStyles'
import CategorySelectPanel from './categorySelect/CategorySelectPanel'
import CategorySelectSheet from './categorySelect/CategorySelectSheet'
import CategorySelectTrigger from './categorySelect/CategorySelectTrigger'
import {
  resolveCategoryType,
  useCategorySelectActions,
  type CategorySelectProps
} from './categorySelect/useCategorySelectActions'
import { useSubcategoryManager } from './categorySelect/useSubcategoryManager'

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
  id,
  invalid = false,
  className,
  placeholder = 'انتخاب دسته‌بندی',
  allOption,
  allowManage = allOption == null,
  showSearchAlways = false,
  lockedCategories = [],
  onPersist,
  allowEmpty = false,
  manageTitle = 'مدیریت دسته‌ها',
  allowSubcategories = false
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

  const isAllSelected = Boolean(allOption && value === allOption.value)

  const hasValue = allOption ? !isAllSelected && Boolean(value) : Boolean(value)

  const displayValue = isAllSelected ? allOption?.label : value

  const subcategory = useSubcategoryManager(
    allowSubcategories ? resolveCategoryType(categoryScope, formId) : undefined
  )

  const { close: closeSubcategories } = subcategory

  const inSubcategories = subcategory.managingCategory !== null

  const activeCategories = inSubcategories ? subcategory.subcategories : categories

  const showSearch = showSearchAlways || activeCategories.length > 3

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return activeCategories

    return activeCategories.filter(category => category.toLowerCase().includes(query))
  }, [activeCategories, searchQuery])

  const ownActions = useCategorySelectActions({
    categories,
    formId,
    categoryScope,
    onCategoriesChange,
    onChange,
    value,
    setSaving,
    lockedCategories,
    onPersist,
    allowEmpty
  })

  const subcategoryActions = useCategorySelectActions({
    categories: subcategory.subcategories,
    onCategoriesChange: next => {
      subcategory.setSubcategories(next)
      onCategoriesChange?.(categories)
    },
    onChange: () => {},
    value: '',
    setSaving,
    onPersist: subcategory.persist,
    allowEmpty: true
  })

  const { handleSaveEdit, handleDelete, handleAdd, handleReorder } = inSubcategories
    ? subcategoryActions
    : ownActions

  const resetTransientState = useCallback(() => {
    setManageMode(false)
    setSearchQuery('')
    setEditingCategory(null)
    setEditText('')
    setConfirmDelete(null)
    closeSubcategories()
  }, [closeSubcategories])

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

    if (inSubcategories) {
      closeSubcategories()
      setSearchQuery('')

      return
    }

    if (manageMode) {
      setManageMode(false)

      return
    }

    setOpen(false)
    resetTransientState()
  }, [
    confirmDelete,
    editingCategory,
    inSubcategories,
    manageMode,
    resetTransientState,
    saving,
    closeSubcategories
  ])

  // The search field is never focused programmatically: on mobile that leaves it
  // focused without a keyboard, so the user taps it themselves.
  useEffect(() => {
    if (!open || !manageMode) return

    const focusTimer = window.setTimeout(() => addInputRef.current?.focus(), 50)

    return () => {
      window.clearTimeout(focusTimer)
    }
  }, [manageMode, open])

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

  const sheetTitle = inSubcategories
    ? `زیردسته‌های «${subcategory.managingCategory}»`
    : manageMode
    ? manageTitle
    : ariaLabel

  return (
    <div
      className={cn(categorySelectRootClass({ open, disabled, saving }), className)}
      data-open={open || undefined}
    >
      <CategorySelectTrigger
        id={id}
        ariaLabel={ariaLabel}
        open={open}
        disabled={disabled}
        saving={saving}
        invalid={invalid}
        label={hasValue || isAllSelected ? displayValue || placeholder : placeholder}
        isPlaceholder={!hasValue && !isAllSelected}
        onOpen={() => !disabled && !saving && setOpen(true)}
      />

      <CategorySelectSheet
        open={open}
        title={sheetTitle}
        manageMode={manageMode || inSubcategories}
        blocked={saving}
        onClose={handleClose}
        onBackFromManage={() => {
          setEditingCategory(null)
          setConfirmDelete(null)
          if (inSubcategories) {
            closeSubcategories()
            setSearchQuery('')

            return
          }
          setManageMode(false)
        }}
      >
        <CategorySelectPanel
          ariaLabel={ariaLabel}
          categories={activeCategories}
          filteredCategories={filteredCategories}
          value={inSubcategories ? '' : value}
          saving={saving}
          manageMode={manageMode || inSubcategories}
          manageLabel={manageTitle}
          allowManage={allowManage}
          lockedCategories={inSubcategories ? [] : lockedCategories}
          canDeleteLast={allowEmpty || inSubcategories}
          onManageSubcategories={
            manageMode && !inSubcategories && subcategory.enabled ? subcategory.open : undefined
          }
          allOption={inSubcategories ? undefined : allOption}
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
          onReorder={handleReorder}
        />
      </CategorySelectSheet>
    </div>
  )
}
