import { cn } from '../../utils/cn'

export const rangeSliderRootClass = 'range-slider flex flex-col gap-[0.55rem] px-[0.15rem]'

export const rangeSliderValueLabelsClass =
  'flex items-center justify-between text-[0.78rem] font-bold text-primary'

export const rangeSliderTrackHostClass = 'relative h-9'

export const rangeSliderRailClass =
  'absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))]'

export const rangeSliderTicksClass =
  'pointer-events-none absolute inset-x-0 top-[calc(50%+0.55rem)] flex justify-between px-[0.35rem]'

export const rangeSliderTickClass =
  'h-2 w-px bg-[color-mix(in_srgb,var(--color-border)_85%,transparent)]'

export const rangeSliderFillClass =
  'absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary'

export const rangeSliderInputClass = cn(
  'range-slider__input pointer-events-none absolute inset-x-0 top-0 m-0 h-9 w-full appearance-none bg-transparent',
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:-mt-[0.45rem] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_1px_4px_color-mix(in_srgb,var(--color-primary)_35%,transparent)] [&::-webkit-slider-thumb]:active:cursor-grabbing',
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent',
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary'
)

export const rangeSliderMinInputClass = 'z-[3]'

export const rangeSliderMaxInputClass = 'z-[4]'

export const rangeSliderEndsClass =
  'flex items-center justify-between text-[0.72rem] font-semibold text-muted'
