import { cn } from '../../utils/cn'

export const appLockIntroClass = 'mb-3 text-[0.85rem] text-muted'

export const appLockStatusClass = 'mb-3 flex flex-wrap gap-2'

export const appLockFootnoteClass = 'mt-3 text-xs text-muted'

export const appLockPolicyClass = 'mb-3 flex flex-col gap-3 border-b border-border pb-3'

export const appLockPolicyListClass = 'flex flex-col gap-2'

export function appLockPolicyOptionClass(selected?: boolean) {
  return cn(
    'flex w-full cursor-pointer flex-col items-stretch gap-[0.35rem] rounded-sm border-[1.5px] border-border bg-bg p-3 text-start text-text',
    'transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)]',
    'hover:border-[var(--form-input-border-hover)] hover:bg-surface',
    selected &&
      'border-primary [background:rgba(15,118,110,0.08)] shadow-[inset_0_0_0_1px_rgba(15,118,110,0.12)]'
  )
}

export const appLockPolicyOptionMainClass = 'flex items-center gap-[0.6rem]'

export function appLockPolicyOptionRadioClass(selected?: boolean) {
  return cn(
    'inline-flex h-[1.1rem] w-[1.1rem] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-white',
    selected && 'border-primary bg-primary'
  )
}

export const appLockPolicyOptionLabelClass = 'text-[0.9rem] font-semibold leading-[1.4]'

export const appLockPolicyOptionDescriptionClass =
  'ps-[1.7rem] text-[0.78rem] leading-[1.5] text-muted'

export const appLockPolicyIdleClass = '-mt-1'

export const appLockActionsClass = 'flex flex-wrap gap-2'

export const appLockFormClass = 'mt-3 flex flex-col gap-3'

export const appLockFormActionsClass = 'flex flex-wrap gap-2'

export const appLockCheckboxClass =
  'flex cursor-pointer items-start gap-2 text-[0.85rem] text-muted [&_input]:mt-[0.15rem]'
