import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'

import { useRegisterOverlay } from '../../hooks/useRegisterOverlay'
import {
  createTypeahead,
  findTypeaheadIndex,
  isTypeaheadKey,
  nextIndexForKey
} from '../../utils/keyboardNav'

interface ListboxOption {
  value: string
  label: string
  disabled?: boolean
}

/** The next enabled option from `index` in the key's direction (Home/End included). */
function nextEnabledIndex(key: string, index: number, options: ListboxOption[]): number | null {
  let next = nextIndexForKey(key, index, options.length, 'vertical', false)

  if (next === null) return null

  const step = key === 'ArrowUp' || key === 'End' ? -1 : 1

  while (next >= 0 && next < options.length && options[next].disabled) next += step

  return next >= 0 && next < options.length ? next : index
}

/**
 * Keyboard model of the custom select (round 5, F4): ↓/↑ on the trigger opens,
 * focus moves to the listbox, ↑↓ Home/End and type-ahead move the active option,
 * Enter/Space pick it, Escape and picking return focus to the trigger, Tab leaves.
 */
export function useSelectListbox(
  options: ListboxOption[],
  value: string,
  onPick: (option: ListboxOption) => void
) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)
  const typeaheadRef = useRef(createTypeahead())
  const idPrefix = useId()

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  useRegisterOverlay(open, () => close(true))

  const openList = () => {
    const selected = options.findIndex(option => option.value === value && !option.disabled)

    setActiveIndex(selected >= 0 ? selected : nextEnabledIndex('Home', -1, options) ?? -1)
    setOpen(true)
  }

  useEffect(() => {
    if (open) listboxRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    document.getElementById(`${idPrefix}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, idPrefix, open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)

    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    openList()
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (options[activeIndex] && !options[activeIndex].disabled) onPick(options[activeIndex])
      close(true)

      return
    }

    if (event.key === 'Tab') {
      close(false)

      return
    }

    if (isTypeaheadKey(event)) {
      const query = typeaheadRef.current(event.key)
      const found = findTypeaheadIndex(
        options.map(option => (option.disabled ? '' : option.label)),
        query,
        activeIndex
      )

      if (found >= 0) setActiveIndex(found)

      return
    }

    const next = nextEnabledIndex(event.key, activeIndex, options)

    if (next === null) return
    event.preventDefault()
    setActiveIndex(next)
  }

  return {
    open,
    activeIndex,
    setActiveIndex,
    rootRef,
    triggerRef,
    listboxRef,
    optionId: (index: number) => `${idPrefix}-${index}`,
    listboxId: `${idPrefix}-listbox`,
    toggle: () => (open ? close(false) : openList()),
    close,
    onTriggerKeyDown,
    onListKeyDown
  }
}
