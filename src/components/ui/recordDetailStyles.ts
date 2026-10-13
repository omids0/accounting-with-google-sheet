import { cx } from '../../utils/cn'

export const recordDetailAmountClass = 'numeric text-[1.15rem] font-extrabold'

export const recordDetailListClass = 'm-0 flex flex-col p-0'

export const recordDetailRowClass = cx(
  'grid grid-cols-[5.5rem_1fr] items-baseline gap-3 border-b border-border py-2.5',
  'text-[0.88rem] first:pt-0 last:border-b-0'
)

export const recordDetailLabelClass = 'text-[0.78rem] text-muted'

export const recordDetailValueClass = 'min-w-0 break-words font-semibold text-text'

export const recordDetailHintClass = 'ms-1 text-[0.74rem] font-normal text-muted'

export const recordDetailSectionClass = 'mt-4 flex flex-col gap-2'

export const recordDetailSectionTitleClass = 'm-0 text-[0.82rem] font-bold text-text'

export const recordDetailThumbsClass = 'flex flex-wrap items-center gap-2'

export const recordDetailThumbButtonClass = cx(
  'cursor-pointer rounded-form border-none bg-transparent p-0',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
)

export const recordDetailLinkClass = cx(
  'cursor-pointer border-none bg-transparent p-0 text-[0.84rem] font-semibold',
  'text-primary-dark underline-offset-2 hover:underline'
)

export const recordDetailActionsClass = 'mt-4 flex flex-wrap gap-2'
