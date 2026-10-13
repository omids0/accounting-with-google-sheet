import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'

import { useRemPx } from '../../hooks/useRemPx'
import { cn } from '../../utils/cn'
import { moveFocusWithArrows, nextIndexForKey } from '../../utils/keyboardNav'
import {
  wheelPickerClass,
  wheelPickerFadeBottomClass,
  wheelPickerFadeTopClass,
  wheelPickerItemClass,
  wheelPickerItemSelectedClass,
  wheelPickerScrollClass
} from '../ui/datePickerStyles'

export interface WheelPickerItem {
  value: string
  label: string
}

interface WheelPickerProps {
  items: WheelPickerItem[]
  value: string
  onChange: (value: string) => void
  'aria-label'?: string
  /** Enter on the focused wheel (e.g. confirm the date sheet). */
  onEnter?: () => void
}

/** 44px at «عادی»; in rem so rows grow with «اندازهٔ متن» (Settings › نمایش). */
const ITEM_HEIGHT_REM = 2.75

const VISIBLE_PADDING = 2

const MAX_DISTANCE = 2.5

const SCROLL_SETTLE_MS = 110

function applyWheelItemVisuals(itemEl: HTMLButtonElement, offsetRows: number) {
  const distance = Math.min(Math.abs(offsetRows), MAX_DISTANCE)

  const t = distance / MAX_DISTANCE

  const isCentered = distance < 0.35

  const scale = 1 - t * 0.1

  const fontSize = 1 - t * 0.14

  const opacity = 1 - t * 0.32

  itemEl.style.transform = `scale(${scale})`
  itemEl.style.opacity = String(isCentered ? 1 : Math.max(0.42, opacity))
  itemEl.style.fontSize = `${Math.max(0.78, fontSize)}rem`
  itemEl.style.fontWeight = isCentered ? '800' : distance < 1.2 ? '500' : '400'
  itemEl.style.color = isCentered
    ? 'var(--wheel-item-active-color, var(--color-primary-dark))'
    : 'var(--wheel-item-muted-color, var(--color-text-muted))'
}

export default function WheelPicker({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
  onEnter
}: WheelPickerProps) {
  const optionIdPrefix = useId()

  const itemHeight = useRemPx(ITEM_HEIGHT_REM)

  const scrollRef = useRef<HTMLDivElement>(null)

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const rafRef = useRef<number>()

  const isUserScrollingRef = useRef(false)

  const selectedIndex = items.findIndex(item => item.value === value)

  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0

  const itemsSignature = items.map(item => item.value).join('\0')

  const padding = VISIBLE_PADDING * itemHeight

  const containerHeight = (VISIBLE_PADDING * 2 + 1) * itemHeight

  const updateVisuals = useCallback(() => {
    const el = scrollRef.current

    if (!el) return

    const centerY = el.scrollTop + containerHeight / 2

    itemRefs.current.forEach((itemEl, index) => {
      if (!itemEl) return

      const itemCenterY = padding + index * itemHeight + itemHeight / 2

      const offset = (itemCenterY - centerY) / itemHeight

      applyWheelItemVisuals(itemEl, offset)
    })
  }, [itemHeight, containerHeight, padding])

  const scheduleVisualUpdate = useCallback(() => {
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(updateVisuals)
  }, [updateVisuals])

  const scrollToIndex = useCallback(
    (index: number, smooth = false) => {
      const el = scrollRef.current

      if (!el) return
      el.scrollTo({
        top: index * itemHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
      scheduleVisualUpdate()
    },
    [itemHeight, scheduleVisualUpdate]
  )

  const emitSelection = useCallback(() => {
    const el = scrollRef.current

    if (!el || items.length === 0) return

    const index = Math.round(el.scrollTop / itemHeight)

    const clamped = Math.max(0, Math.min(items.length - 1, index))

    if (clamped !== safeIndex) {
      onChange(items[clamped].value)
    }

    scrollToIndex(clamped, true)
    isUserScrollingRef.current = false
  }, [itemHeight, items, onChange, safeIndex, scrollToIndex])

  useLayoutEffect(() => {
    if (isUserScrollingRef.current) return

    const el = scrollRef.current

    if (!el) return
    el.scrollTop = safeIndex * itemHeight
    scheduleVisualUpdate()
  }, [itemHeight, safeIndex, itemsSignature, scheduleVisualUpdate])

  useLayoutEffect(() => {
    scheduleVisualUpdate()
  }, [itemsSignature, scheduleVisualUpdate])

  useEffect(() => {
    return () => {
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current)
      }
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current

    if (!el) return

    const onNativeScrollEnd = () => {
      clearTimeout(scrollTimeoutRef.current)
      emitSelection()
      scheduleVisualUpdate()
    }

    el.addEventListener('scrollend', onNativeScrollEnd)

    return () => el.removeEventListener('scrollend', onNativeScrollEnd)
  }, [emitSelection, scheduleVisualUpdate])

  const handleScroll = () => {
    isUserScrollingRef.current = true
    scheduleVisualUpdate()
    clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(emitSelection, SCROLL_SETTLE_MS)
  }

  const handleScrollEnd = () => {
    clearTimeout(scrollTimeoutRef.current)
    emitSelection()
  }

  // Keyboard (round 5, F4): ↑↓ Home/End change the value, ←→ move to the wheel on
  // that side of the screen (day ↔ month ↔ year), Enter confirms.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && onEnter) {
      event.preventDefault()
      onEnter()

      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const group = event.currentTarget.closest('[data-wheel-group]')
      const wheels = group ? Array.from(group.querySelectorAll<HTMLElement>('[data-wheel]')) : []

      moveFocusWithArrows(event, wheels, { axis: 'horizontal', wrap: false })

      return
    }

    const next = nextIndexForKey(event.key, safeIndex, items.length, 'vertical', false)

    if (next === null) return
    event.preventDefault()
    clearTimeout(scrollTimeoutRef.current)
    isUserScrollingRef.current = false
    if (next !== safeIndex) onChange(items[next].value)
    scrollToIndex(next)
  }

  itemRefs.current.length = items.length

  return (
    <div
      className={wheelPickerClass}
      style={{
        height: containerHeight,
        ['--wheel-item-height' as string]: `${itemHeight}px`
      }}
      aria-label={ariaLabel}
      role="listbox"
      tabIndex={0}
      aria-activedescendant={items.length > 0 ? `${optionIdPrefix}-${safeIndex}` : undefined}
      data-wheel
      onKeyDown={handleKeyDown}
    >
      <div className={wheelPickerFadeTopClass} aria-hidden="true" />
      <div className={wheelPickerFadeBottomClass} aria-hidden="true" />
      <div
        ref={scrollRef}
        className={wheelPickerScrollClass}
        style={{ scrollPaddingBlock: padding }}
        role="presentation"
        // One Tab stop per wheel: the listbox, not the scroller or its options.
        tabIndex={-1}
        onScroll={handleScroll}
        onTouchEnd={handleScrollEnd}
        onPointerUp={handleScrollEnd}
      >
        <div style={{ height: padding }} aria-hidden="true" />
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={el => {
              itemRefs.current[index] = el
            }}
            id={`${optionIdPrefix}-${index}`}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={item.value === value}
            className={cn(wheelPickerItemClass, wheelPickerItemSelectedClass(item.value === value))}
            style={{ height: itemHeight }}
            onClick={() => {
              onChange(item.value)
              scrollToIndex(index, true)
            }}
          >
            {item.label}
          </button>
        ))}
        <div style={{ height: padding }} aria-hidden="true" />
      </div>
    </div>
  )
}
