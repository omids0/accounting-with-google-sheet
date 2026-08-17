import { useCallback, useEffect, useRef } from 'react';

export interface WheelPickerItem {
  value: string;
  label: string;
}

interface WheelPickerProps {
  items: WheelPickerItem[];
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
}

const ITEM_HEIGHT = 38;
const VISIBLE_PADDING = 2;

export default function WheelPicker({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
}: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isUserScrollingRef = useRef(false);

  const selectedIndex = items.findIndex((item) => item.value === value);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const scrollToIndex = useCallback((index: number, smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  const emitSelection = useCallback(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));

    if (clamped !== safeIndex) {
      onChange(items[clamped].value);
    }

    scrollToIndex(clamped);
    isUserScrollingRef.current = false;
  }, [items, onChange, safeIndex, scrollToIndex]);

  useEffect(() => {
    if (isUserScrollingRef.current) return;
    scrollToIndex(safeIndex);
  }, [safeIndex, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onNativeScrollEnd = () => {
      clearTimeout(scrollTimeoutRef.current);
      emitSelection();
    };

    el.addEventListener('scrollend', onNativeScrollEnd);
    return () => el.removeEventListener('scrollend', onNativeScrollEnd);
  }, [emitSelection]);

  const handleScroll = () => {
    isUserScrollingRef.current = true;
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(emitSelection, 80);
  };

  const handleScrollEnd = () => {
    clearTimeout(scrollTimeoutRef.current);
    emitSelection();
  };

  const padding = VISIBLE_PADDING * ITEM_HEIGHT;
  const containerHeight = (VISIBLE_PADDING * 2 + 1) * ITEM_HEIGHT;

  return (
    <div
      className="wheel-picker"
      style={{ height: containerHeight }}
      aria-label={ariaLabel}
      role="listbox"
    >
      <div className="wheel-picker-highlight" aria-hidden="true" />
      <div className="wheel-picker-fade wheel-picker-fade--top" aria-hidden="true" />
      <div className="wheel-picker-fade wheel-picker-fade--bottom" aria-hidden="true" />
      <div
        ref={scrollRef}
        className="wheel-picker-scroll"
        onScroll={handleScroll}
        onTouchEnd={handleScrollEnd}
        onMouseUp={handleScrollEnd}
      >
        <div className="wheel-picker-padding" style={{ height: padding }} />
        {items.map((item, index) => (
          <button
            key={item.value}
            type="button"
            role="option"
            aria-selected={item.value === value}
            className={`wheel-picker-item${item.value === value ? ' is-selected' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => {
              onChange(item.value);
              scrollToIndex(index, true);
            }}
          >
            {item.label}
          </button>
        ))}
        <div className="wheel-picker-padding" style={{ height: padding }} />
      </div>
    </div>
  );
}
