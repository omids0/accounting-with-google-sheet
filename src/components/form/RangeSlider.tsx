import { cn } from '../../utils/cn'
import {
  rangeSliderEndsClass,
  rangeSliderFillClass,
  rangeSliderInputClass,
  rangeSliderMaxInputClass,
  rangeSliderMinInputClass,
  rangeSliderRailClass,
  rangeSliderRootClass,
  rangeSliderTickClass,
  rangeSliderTicksClass,
  rangeSliderTrackHostClass,
  rangeSliderValueLabelsClass
} from '../ui/rangeSliderStyles'

export type RangeSliderValue = {
  from: number
  to: number
}

type RangeSliderProps = {
  min?: number
  max: number
  step?: number
  value: RangeSliderValue
  onChange: (value: RangeSliderValue) => void
  formatValue?: (value: number) => string
  endMinLabel?: string
  endMaxLabel?: string
  minAriaLabel?: string
  maxAriaLabel?: string
}

function clamp(value: number, lower: number, upper: number) {
  return Math.min(upper, Math.max(lower, value))
}

function snap(value: number, step: number) {
  if (step <= 1) return value

  return Math.round(value / step) * step
}

function toPercent(value: number, min: number, max: number) {
  if (max <= min) return 0

  return ((value - min) / (max - min)) * 100
}

export default function RangeSlider({
  min = 0,
  max,
  step = 1,
  value,
  onChange,
  formatValue = current => current.toLocaleString('fa-IR'),
  endMinLabel,
  endMaxLabel,
  minAriaLabel = 'حداقل',
  maxAriaLabel = 'حداکثر'
}: RangeSliderProps) {
  const safeMax = Math.max(min + step, max)
  const from = clamp(value.from, min, value.to)
  const to = clamp(value.to, from, safeMax)
  const fillLeft = toPercent(from, min, safeMax)
  const fillWidth = Math.max(0, toPercent(to, min, safeMax) - fillLeft)

  const handleMinChange = (next: number) => {
    const snapped = snap(clamp(next, min, to), step)
    onChange({ from: snapped, to })
  }

  const handleMaxChange = (next: number) => {
    const snapped = snap(clamp(next, from, safeMax), step)
    onChange({ from, to: snapped })
  }

  return (
    <div className={rangeSliderRootClass} dir="ltr">
      <div className={rangeSliderValueLabelsClass}>
        <span>{formatValue(from)}</span>
        <span>{formatValue(to)}</span>
      </div>

      <div className={rangeSliderTrackHostClass}>
        <div className={rangeSliderRailClass} aria-hidden="true" />
        <div
          className={rangeSliderFillClass}
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={from}
          onChange={event => handleMinChange(Number(event.target.value))}
          className={cn(rangeSliderInputClass, rangeSliderMinInputClass)}
          aria-label={minAriaLabel}
          aria-valuemin={min}
          aria-valuemax={to}
          aria-valuenow={from}
        />
        <input
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={to}
          onChange={event => handleMaxChange(Number(event.target.value))}
          className={cn(rangeSliderInputClass, rangeSliderMaxInputClass)}
          aria-label={maxAriaLabel}
          aria-valuemin={from}
          aria-valuemax={safeMax}
          aria-valuenow={to}
        />
        <div className={rangeSliderTicksClass} aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={rangeSliderTickClass} />
          ))}
        </div>
      </div>

      <div className={rangeSliderEndsClass}>
        <span>{endMinLabel ?? formatValue(min)}</span>
        <span>{endMaxLabel ?? formatValue(safeMax)}</span>
      </div>
    </div>
  )
}
