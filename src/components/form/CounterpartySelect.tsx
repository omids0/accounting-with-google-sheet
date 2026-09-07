import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getCounterpartyFullName } from '../../services/counterparties'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import CounterpartyFormModal from '../counterparties/CounterpartyFormModal'
import type { CounterpartyWithRow } from '../counterparties/types'
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
import CategorySelectSheet from './categorySelect/CategorySelectSheet'
import CounterpartySelectPanel from './counterpartySelect/CounterpartySelectPanel'
import {
  useCounterpartySelectActions,
  type CounterpartySelectProps
} from './counterpartySelect/useCounterpartySelectActions'

export type { CounterpartySelectProps } from './counterpartySelect/useCounterpartySelectActions'

export default function CounterpartySelect({
  value,
  onChange,
  counterparties,
  onCounterpartiesChange,
  disabled = false,
  'aria-label': ariaLabel = 'طرف حساب',
  id,
  invalid = false,
  className,
  placeholder = 'انتخاب طرف حساب',
  allOption,
  allowManage = allOption == null,
  showSearchAlways = false
}: CounterpartySelectProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [manageMode, setManageMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<CounterpartyWithRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formEditingItem, setFormEditingItem] = useState<CounterpartyWithRow | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const isAllSelected = Boolean(allOption && value === allOption.value)

  const hasValue = allOption ? !isAllSelected && Boolean(value) : Boolean(value)

  const displayValue = isAllSelected ? allOption?.label : value

  const showSearch = showSearchAlways || counterparties.length > 3

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return counterparties

    return counterparties.filter(item =>
      getCounterpartyFullName(item).toLowerCase().includes(query)
    )
  }, [counterparties, searchQuery])

  const { handleSubmitForm, handleDelete, handleReorder } = useCounterpartySelectActions({
    counterparties,
    onCounterpartiesChange,
    onChange,
    value,
    setSaving
  })

  const resetTransientState = useCallback(() => {
    setManageMode(false)
    setSearchQuery('')
    setConfirmDelete(null)
  }, [])

  const handleClose = useCallback(() => {
    if (saving || formOpen) return

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
  }, [confirmDelete, formOpen, manageMode, resetTransientState, saving])

  useEffect(() => {
    if (!open || formOpen) return

    const focusTimer = window.setTimeout(() => {
      if (showSearch) {
        searchInputRef.current?.focus()
      }
    }, 50)

    return () => {
      window.clearTimeout(focusTimer)
    }
  }, [formOpen, open, showSearch])

  const openCreateForm = () => {
    setFormEditingItem(null)
    setFormOpen(true)
  }

  const openEditForm = (item: CounterpartyWithRow) => {
    setFormEditingItem(item)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setFormEditingItem(null)
  }

  const handleSelect = (name: string) => {
    if (saving || confirmDelete || manageMode) return
    onChange(name)
    setOpen(false)
    resetTransientState()
  }

  const sheetTitle = manageMode ? 'مدیریت طرف حساب‌ها' : ariaLabel

  return (
    <div
      className={cn(categorySelectRootClass({ open, disabled, saving }), className)}
      data-open={open || undefined}
    >
      <button
        id={id}
        type="button"
        className={cn(
          customSelectTriggerClass,
          categorySelectTriggerClass,
          customSelectTriggerStateClass({ open, disabled: disabled || saving, invalid })
        )}
        onClick={() => !disabled && !saving && setOpen(true)}
        disabled={disabled || saving}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={categorySelectLeadingClass} aria-hidden="true">
          <AppIcon name="counterparties" size={16} strokeWidth={2} />
        </span>
        <span
          className={cn(
            customSelectValueClass,
            !hasValue && !isAllSelected && categorySelectPlaceholderClass
          )}
        >
          {hasValue || isAllSelected ? displayValue : placeholder}
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
        blocked={saving || formOpen}
        onClose={handleClose}
        onBackFromManage={() => {
          setManageMode(false)
          setConfirmDelete(null)
        }}
      >
        <CounterpartySelectPanel
          ariaLabel={ariaLabel}
          items={counterparties}
          filteredItems={filteredItems}
          value={value}
          saving={saving}
          manageMode={manageMode}
          allowManage={allowManage}
          allOption={allOption}
          showSearch={showSearch}
          searchQuery={searchQuery}
          confirmDelete={confirmDelete}
          searchInputRef={searchInputRef}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onSelect={handleSelect}
          onOpenCreateForm={openCreateForm}
          onStartEdit={openEditForm}
          onConfirmDelete={item => {
            setConfirmDelete(item)
          }}
          onCancelDelete={() => setConfirmDelete(null)}
          onDelete={item => handleDelete(item, setConfirmDelete)}
          onOpenManageMode={() => setManageMode(true)}
          onReorder={handleReorder}
        />
      </CategorySelectSheet>

      {allowManage && (
        <CounterpartyFormModal
          open={formOpen}
          editingItem={formEditingItem}
          saving={saving}
          onClose={closeForm}
          onSubmit={async values => {
            const saved = await handleSubmitForm(values, formEditingItem)

            if (saved) {
              closeForm()
            }
          }}
        />
      )}
    </div>
  )
}
