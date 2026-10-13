import { cn, cx } from '../../utils/cn'

/** Round 7, Task E: «بستن سال» — four step rows with a ✓ / number mark each. */

export const closeYearPageClass = 'mx-auto flex w-full max-w-[640px] flex-col gap-3'

export const closeYearPurposeClass = 'text-[0.85rem] leading-[1.9] text-muted'

export const closeYearStepsClass = 'flex flex-col divide-y divide-dashed divide-border'

export const closeYearStepClass = 'flex items-start gap-3 py-3 first:pt-0 last:pb-0'

export function closeYearMarkClass(done: boolean) {
  return cn(
    'numeric inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
    'text-[0.8rem] font-extrabold',
    done
      ? 'border-[1.5px] border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-success'
      : 'border-[1.5px] border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] text-primary'
  )
}

export const closeYearStepBodyClass = 'flex min-w-0 flex-1 flex-col gap-1'

export const closeYearStepTitleClass = 'text-[0.9rem] font-extrabold text-text'

export const closeYearStepHintClass = 'text-[0.78rem] leading-[1.8] text-muted'

export const closeYearActionsClass = 'mt-1 flex flex-wrap items-center gap-2'

export const closeYearAccountListClass = 'mt-1 flex flex-col gap-1.5'

export const closeYearAccountRowClass = cx(
  'flex items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2',
  'text-[0.8rem] text-text'
)

export const closeYearAccountTitleClass = 'min-w-0 truncate font-bold'

export function closeYearAccountStatusClass(done: boolean) {
  return cn('flex-shrink-0 text-[0.75rem]', done ? 'font-bold text-success' : 'text-muted')
}
