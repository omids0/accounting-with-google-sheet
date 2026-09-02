import { useEffect, useMemo, useRef, useState } from 'react'

import { isTokenValid } from '../../services/auth'
import {
  saveDangCategoriesToSheet,
  saveFormCategoriesToSheet,
  saveReceivableCategoriesToSheet
} from '../../services/categories'
import type { CategoryType } from '../../services/categories'
import { getSettings } from '../../services/settings'
import { showError, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  formId?: string
  categoryScope?: CategoryType
  onCategoriesChange?: (categories: string[]) => void
  onReauth?: () => void
  disabled?: boolean
  'aria-label'?: string
  id?: string
}

export default function CategorySelect({
  value,
  onChange,
  categories,
  formId,
  categoryScope,
  onCategoriesChange,
  onReauth,
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

  const persistCategories = async (next: string[]): Promise<boolean> => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return false
    }
    if (!isTokenValid()) {
      onReauth?.()

      return false
    }
    if (!next.length) {
      showError('حداقل یک دسته‌بندی لازم است')

      return false
    }

    setSaving(true)
    try {
      if (categoryScope === 'dang') {
        await saveDangCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'receivable') {
        await saveReceivableCategoriesToSheet(settings.spreadsheetId, next)
      } else {
        if (!formId) {
          showError('فرم دسته‌بندی معتبر نیست')

          return false
        }
        await saveFormCategoriesToSheet(settings.spreadsheetId, formId, next)
      }
      onCategoriesChange?.(next)
      showSuccess('دسته‌بندی‌ها ذخیره شد')

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره دسته‌بندی‌ها'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return false
      }
      showError(msg)

      return false
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (category: string) => {
    setEditingCategory(category)
    setEditText(category)
    setConfirmDelete(null)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditText('')
  }

  const handleSaveEdit = async (oldName: string) => {
    const name = editText.trim()

    if (!name) {
      showError('نام دسته‌بندی خالی است')

      return
    }
    if (name === oldName) {
      cancelEdit()

      return
    }
    if (categories.includes(name)) {
      showError('این دسته‌بندی قبلاً وجود دارد')

      return
    }

    const next = categories.map(item => (item === oldName ? name : item))

    if (await persistCategories(next)) {
      if (value === oldName) onChange(name)
      cancelEdit()
    }
  }

  const handleDelete = async (category: string) => {
    if (categories.length <= 1) {
      showError('حداقل یک دسته‌بندی باید بماند')

      return
    }

    const next = categories.filter(item => item !== category)

    if (await persistCategories(next)) {
      if (value === category) onChange(next[0] ?? '')
      setConfirmDelete(null)
    }
  }

  const handleAdd = async () => {
    const name = newCategory.trim()

    if (!name) return
    if (categories.includes(name)) {
      showError('این دسته‌بندی قبلاً وجود دارد')

      return
    }

    const next = [...categories, name]

    if (await persistCategories(next)) {
      setNewCategory('')
      onChange(name)
      setSearchQuery('')
    }
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
        <div className="category-select-panel">
          <div className="category-select-header">
            <div className="category-select-header-title">
              <span>{ariaLabel}</span>
              <span className="category-select-count">{categories.length}</span>
            </div>
            <button
              type="button"
              className={['category-select-manage-btn', manageMode && 'is-active']
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setManageMode(active => !active)
                setEditingCategory(null)
                setConfirmDelete(null)
              }}
              disabled={saving}
              aria-pressed={manageMode}
            >
              <AppIcon name="settings" size={14} strokeWidth={2} />
              {manageMode ? 'اتمام' : 'مدیریت'}
            </button>
          </div>

          {showSearch && (
            <div className="category-select-search">
              <AppIcon name="search" size={15} strokeWidth={2} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجو در دسته‌ها..."
                disabled={saving}
                aria-label="جستجوی دسته‌بندی"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="category-select-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="پاک کردن جستجو"
                >
                  <AppIcon name="close" size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          )}

          {manageMode && (
            <div className="category-select-add">
              <div className="category-select-add-row">
                <input
                  ref={addInputRef}
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAdd()
                    }
                  }}
                  placeholder="نام دسته جدید..."
                  disabled={saving}
                  aria-label="دسته‌بندی جدید"
                />
                <button
                  type="button"
                  className="category-select-add-btn"
                  onClick={handleAdd}
                  disabled={saving || !newCategory.trim()}
                  aria-label="افزودن دسته"
                >
                  <AppIcon name="add" size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          <div className="category-select-list" role="listbox" aria-label={ariaLabel}>
            {filteredCategories.length === 0 ? (
              <div className="category-select-empty">
                {searchQuery.trim() ? 'دسته‌ای با این نام پیدا نشد' : 'هنوز دسته‌بندی ثبت نشده'}
              </div>
            ) : (
              filteredCategories.map(category => {
                const isSelected = value === category

                const isEditing = editingCategory === category

                const isConfirmingDelete = confirmDelete === category

                return (
                  <div
                    key={category}
                    className={[
                      'category-select-item',
                      isSelected && 'is-selected',
                      isEditing && 'is-editing',
                      isConfirmingDelete && 'is-confirming'
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isConfirmingDelete ? (
                      <div className="category-select-confirm">
                        <span>حذف «{category}»؟</span>
                        <div className="category-select-confirm-actions">
                          <button
                            type="button"
                            className="category-select-confirm-btn category-select-confirm-btn--danger"
                            onClick={() => handleDelete(category)}
                            disabled={saving}
                          >
                            حذف
                          </button>
                          <button
                            type="button"
                            className="category-select-confirm-btn"
                            onClick={() => setConfirmDelete(null)}
                            disabled={saving}
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    ) : isEditing ? (
                      <div className="category-select-edit">
                        <input
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleSaveEdit(category)
                            }
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          disabled={saving}
                          aria-label="ویرایش دسته‌بندی"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="category-select-icon-btn category-select-icon-btn--save"
                          onClick={() => handleSaveEdit(category)}
                          disabled={saving}
                          aria-label="تایید"
                        >
                          <AppIcon name="check" size={14} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          className="category-select-icon-btn"
                          onClick={cancelEdit}
                          disabled={saving}
                          aria-label="انصراف"
                        >
                          <AppIcon name="close" size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className="category-select-option"
                          onClick={() => handleSelect(category)}
                          disabled={saving || manageMode}
                        >
                          <span className="category-select-option-check" aria-hidden="true">
                            {isSelected && <AppIcon name="check" size={14} strokeWidth={2.5} />}
                          </span>
                          <span className="category-select-option-label">{category}</span>
                        </button>
                        {manageMode && (
                          <div className="category-select-actions">
                            <button
                              type="button"
                              className="category-select-icon-btn"
                              onClick={e => {
                                e.stopPropagation()
                                startEdit(category)
                              }}
                              disabled={saving}
                              aria-label={`ویرایش ${category}`}
                            >
                              <AppIcon name="edit" size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="category-select-icon-btn category-select-icon-btn--danger"
                              onClick={e => {
                                e.stopPropagation()
                                setConfirmDelete(category)
                                setEditingCategory(null)
                              }}
                              disabled={saving || categories.length <= 1}
                              aria-label={`حذف ${category}`}
                            >
                              <AppIcon name="trash" size={14} strokeWidth={2} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {!manageMode && (
            <div className="category-select-footer">
              <button
                type="button"
                className="category-select-footer-btn"
                onClick={() => setManageMode(true)}
                disabled={saving}
              >
                <AppIcon name="add" size={14} strokeWidth={2.5} />
                افزودن یا ویرایش دسته‌ها
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
