import { formFieldsLayoutClass } from './formStyles'
import { appScrollbarClass } from './scrollbarStyles'
import { cx } from '../../utils/cn'

export const formModalRootClass = cx(
  'fixed inset-0 z-[100] box-border flex items-end justify-center p-4',
  'pt-[max(1rem,var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]',
  'min-[520px]:items-center min-[520px]:pb-[max(1rem,var(--safe-bottom))]'
)

export const formModalBackdropClass = cx(
  'absolute inset-0 cursor-default border-none bg-[var(--color-overlay)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)]'
)

export const formModalPanelClass = cx(
  'form-modal-panel relative flex max-h-full min-h-0 w-full max-w-[420px] flex-col overflow-hidden',
  'rounded-[calc(var(--radius)+4px)_calc(var(--radius)+4px)_var(--radius)_var(--radius)]',
  'border border-border bg-surface',
  'shadow-[0_12px_40px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.55)]',
  'animate-[form-modal-in_var(--duration-normal)_var(--ease-out)] motion-reduce:animate-none',
  'min-[520px]:rounded-[calc(var(--radius)+4px)]',
  'md:max-w-[30rem]',
  '[&_form]:flex [&_form]:min-h-0 [&_form]:flex-1 [&_form]:flex-col'
)

export const formModalPanelWideClass = 'md:max-w-[40rem]'

export const formModalHeaderClass = cx(
  'grid flex-shrink-0 grid-cols-[1fr_auto] grid-rows-[auto_auto] items-center gap-x-3',
  'border-b border-border px-[1.15rem] pb-[0.85rem] pt-[0.45rem]',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_40%,var(--color-surface))]',
  'before:col-span-full before:mb-[0.6rem] before:h-[0.28rem] before:w-10 before:justify-self-center',
  'before:rounded-full before:content-[""]',
  'before:[background:color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]',
  'min-[520px]:flex min-[520px]:items-center min-[520px]:justify-between min-[520px]:pt-[0.65rem]',
  'min-[520px]:before:hidden'
)

export const formModalTitleClass = cx(
  'col-start-1 row-start-2 m-0 min-w-0 flex-1 text-[1.02rem] font-extrabold tracking-[-0.02em] text-primary-dark'
)

export const formModalCloseClass = cx(
  'col-start-2 row-start-2 flex h-touch-min w-touch-min flex-shrink-0 cursor-pointer items-center justify-center',
  'self-center rounded-full border border-border bg-[var(--form-input-bg)] p-0 leading-none text-muted',
  'transition-[background,color,border-color,box-shadow] duration-[var(--duration-fast)]',
  'hover:enabled:border-[var(--form-input-border-hover)] hover:enabled:bg-accent-soft hover:enabled:text-text',
  'disabled:cursor-not-allowed disabled:opacity-40'
)

export const formModalBodyClass = cx(
  appScrollbarClass,
  'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-[1.15rem] pb-1 pt-[1.1rem]',
  '[-webkit-overflow-scrolling:touch] [&_.form-field:last-child]:mb-0 [&_.form-group:last-child]:mb-0',
  // A modal is one narrow column: every control fills it. The compact/standard shell caps are for
  // wide pages and left dates, counts and pickers at 90-215px next to full-width neighbours.
  '[&_.form-control-shell]:max-w-none'
)

export const formModalFieldsLayoutClass = formFieldsLayoutClass

export const formModalActionsClass = cx(
  'mt-0 flex-shrink-0 items-center border-t border-border px-[1.15rem] pb-[calc(1.1rem+var(--safe-bottom))] pt-[0.9rem]',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_40%,var(--color-surface))]',
  '[&>button]:min-w-[6.5rem] [&>button]:flex-1',
  'md:justify-end md:[&>button]:flex-none'
)

/**
 * `FormModal variant="panel"`: on desktop (≥ 1280px) a 380px side panel on the
 * left edge, with the list still visible beside it. Below that, the usual sheet.
 */
export const formModalRootPanelClass = 'xl:items-stretch xl:justify-end xl:p-0'

export const formModalBackdropPanelClass = 'xl:bg-transparent'

export const formModalPanelSideClass = cx(
  'xl:h-full xl:max-h-none xl:w-[23.75rem] xl:max-w-[23.75rem] xl:rounded-none xl:border-0 xl:border-s',
  'xl:shadow-[0_0_40px_rgba(15,23,42,0.22)] xl:animate-[fadeIn_var(--duration-normal)_var(--ease-out)]',
  // 380px is phone width: paired fields stack again, full width (the row's md:items-start
  // shrank every stacked field to its content, hence items-stretch).
  'xl:[&_.form-row]:flex xl:[&_.form-row]:items-stretch'
)
