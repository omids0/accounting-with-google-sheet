import RangeSlider from './form/RangeSlider'
import { recordsFilterLabelClass, recordsFilterSectionClassName } from './ui/recordsStyles'
import {
  formatMileageKm,
  resolveMileageSliderStep,
  type MileageRangeValue
} from '../utils/mileageRange'

type MileageRangeFilterProps = {
  value: MileageRangeValue
  onChange: (value: MileageRangeValue) => void
  sliderMax: number
  label?: string
}

export default function MileageRangeFilter({
  value,
  onChange,
  sliderMax,
  label = 'بازه کارکرد'
}: MileageRangeFilterProps) {
  const step = resolveMileageSliderStep(sliderMax)

  return (
    <div className={recordsFilterSectionClassName()}>
      <span className={recordsFilterLabelClass}>{label}</span>
      <RangeSlider
        min={0}
        max={sliderMax}
        step={step}
        value={{ from: value.min, to: value.max }}
        onChange={next => onChange({ min: next.from, max: next.to })}
        formatValue={formatMileageKm}
        endMinLabel="کمترین"
        endMaxLabel="بیشترین"
        minAriaLabel="حداقل کارکرد"
        maxAriaLabel="حداکثر کارکرد"
      />
    </div>
  )
}
