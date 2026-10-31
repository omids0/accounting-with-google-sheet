import { useId } from 'react'

import ForecastMoney from './ForecastMoney'
import { LATE_CHECK_DAYS } from './useCashForecast'
import { useMaskedText } from '../../hooks/useAmountsHidden'
import { formatCompactNumber, formatMoney, formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'

const rangeClass = 'm-0 block h-11 w-full cursor-pointer accent-[var(--color-primary)]'

/**
 * «اگر خرج روزانه این‌قدر باشد»: the slider whose value the whole estimate follows, with a money
 * scale under it, and the one «what if» switch (received checks arrive late).
 */
export default function ForecastSpendingControl({
  value,
  max,
  step,
  onChange,
  lateChecks,
  onLateChecksChange
}: {
  value: number
  max: number
  step: number
  onChange: (value: number) => void
  lateChecks: boolean
  onLateChecksChange: (on: boolean) => void
}) {
  const sliderId = useId()
  const masked = useMaskedText()
  const top = Math.max(max, value)

  return (
    <CalmBlock title="خرج روزانه">
      <label htmlFor={sliderId} className="block text-[0.82rem] text-text">
        اگر خرج روزانه این‌قدر باشد: <ForecastMoney amount={value} />
      </label>
      <input
        id={sliderId}
        type="range"
        className={rangeClass}
        min={0}
        max={top}
        step={step}
        value={value}
        aria-valuetext={masked(`${formatMoney(value)} در روز`)}
        onChange={event => onChange(Number(event.target.value))}
      />
      <div className="flex justify-between text-[0.72rem] text-muted" aria-hidden="true">
        <span>
          <bdi>۰</bdi>
        </span>
        <span>
          <bdi>{formatCompactNumber(top / 2)}</bdi>
        </span>
        <span>
          <bdi>{formatCompactNumber(top)}</bdi>
        </span>
      </div>
      <p className="mt-2 mb-0 text-[0.76rem] leading-[1.8] text-muted">
        این خرج جدا از قسط، چک و تکرارهای ثبت‌شده است و از فردا هر روز کم می‌شود. روی ۰ باشد، فقط
        سررسیدهای شناخته‌شده حساب می‌شوند.
      </p>

      <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 text-[0.8rem]">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          checked={lateChecks}
          onChange={event => onLateChecksChange(event.target.checked)}
        />
        <span>اگر چک‌های دریافتی {formatPersianNumber(LATE_CHECK_DAYS)} روز دیر وصول شوند</span>
      </label>
    </CalmBlock>
  )
}
