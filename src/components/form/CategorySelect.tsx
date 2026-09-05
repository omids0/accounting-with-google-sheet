import { useEffect, useMemo, useRef, useState } from 'react'

import AppIcon from '../AppIcon'
import CategorySelectPanel from './categorySelect/CategorySelectPanel'
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

  const rootRef = useRef<HTMLDivElement>(null)

  const addInputRef = useRef<HTMLInputElement>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const hasValue = Boolean(value)

  const showSearch = categories.length > 4

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

  useEffect(() => {
    if (!open) {
      setManageMode(false)
      setSearchQuery('')
      setEditingCategory(null)
      setConfirmDelete(null)

      return
    }

    const focusTimer = window.setTimeout(() => {
      if (showSearch) {
        searchInputRef.current?.focus()
      } else {
        addInputRef.current?.focus()
      }
    }, 0)

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setEditingCategory(null)
        setConfirmDelete(null)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, editingCategory, confirmDelete, manageMode, showSearch])

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
  }

  const rootClass = [
    'custom-select',
    'category-select',
    open && 'custom-select--open',
    disabled && 'custom-select--disabled',
    saving && 'category-select--saving'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        id={id}
        type="button"
        className="custom-select-trigger category-select-trigger"
        onClick={() => !disabled && !saving && setOpen(isOpen => !isOpen)}
        disabled={disabled || saving}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="category-select-trigger-leading" aria-hidden="true">
          <AppIcon name="folder" size={16} strokeWidth={2} />
        </span>
        <span
          className={['custom-select-value', !hasValue && 'category-select-placeholder']
            .filter(Boolean)
            .join(' ')}
        >
          {hasValue ? value : 'انتخاب دسته‌بندی'}
        </span>
        {saving ? (
          <span className="spinner category-select-spinner" aria-hidden="true" />
        ) : (
          <span className="custom-select-chevron" aria-hidden="true" />
        )}
      </button>

      {open && (
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
          onToggleManageMode={() => {
            setManageMode(active => !active)
            setEditingCategory(null)
            setConfirmDelete(null)
          }}
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
      )}
    </div>
  )
}
