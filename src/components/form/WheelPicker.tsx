import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import { cn } from '../../utils/cn'
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
}

const ITEM_HEIGHT = 44

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
  'aria-label': ariaLabel
}: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const rafRef = useRef<number>()

  const isUserScrollingRef = useRef(false)

  const selectedIndex = items.findIndex(item => item.value === value)

  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0

  const itemsSignature = items.map(item => item.value).join('\0')

  const padding = VISIBLE_PADDING * ITEM_HEIGHT

  const containerHeight = (VISIBLE_PADDING * 2 + 1) * ITEM_HEIGHT

  const updateVisuals = useCallback(() => {
    const el = scrollRef.current

    if (!el) return

    const centerY = el.scrollTop + containerHeight / 2

    itemRefs.current.forEach((itemEl, index) => {
      if (!itemEl) return

      const itemCenterY = padding + index * ITEM_HEIGHT + ITEM_HEIGHT / 2

      const offset = (itemCenterY - centerY) / ITEM_HEIGHT

      applyWheelItemVisuals(itemEl, offset)
    })
  }, [containerHeight, padding])

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
        top: index * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto'
      })
      scheduleVisualUpdate()
    },
    [scheduleVisualUpdate]
  )

  const emitSelection = useCallback(() => {
    const el = scrollRef.current

    if (!el || items.length === 0) return

    const index = Math.round(el.scrollTop / ITEM_HEIGHT)

    const clamped = Math.max(0, Math.min(items.length - 1, index))

    if (clamped !== safeIndex) {
      onChange(items[clamped].value)
    }

    scrollToIndex(clamped, true)
    isUserScrollingRef.current = false
  }, [items, onChange, safeIndex, scrollToIndex])

  useLayoutEffect(() => {
    if (isUserScrollingRef.current) return

    const el = scrollRef.current

    if (!el) return
    el.scrollTop = safeIndex * ITEM_HEIGHT
    scheduleVisualUpdate()
  }, [safeIndex, itemsSignature, scheduleVisualUpdate])

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

  itemRefs.current.length = items.length

  return (
    <div
      className={wheelPickerClass}
      style={{
        height: containerHeight,
        ['--wheel-item-height' as string]: `${ITEM_HEIGHT}px`
      }}
      aria-label={ariaLabel}
      role="listbox"
    >
      <div className={wheelPickerFadeTopClass} aria-hidden="true" />
      <div className={wheelPickerFadeBottomClass} aria-hidden="true" />
      <div
        ref={scrollRef}
        className={wheelPickerScrollClass}
        style={{ scrollPaddingBlock: padding }}
        role="presentation"
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
            type="button"
            role="option"
            aria-selected={item.value === value}
            className={cn(wheelPickerItemClass, wheelPickerItemSelectedClass(item.value === value))}
            style={{ height: ITEM_HEIGHT }}
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
