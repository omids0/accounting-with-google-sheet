import { cx } from '../../utils/cn'

/** «پیوست» field: thumbnails, then the 📷 and 🖼 buttons, one row. */
export const attachmentFieldRowClass = 'flex flex-wrap items-center gap-2'

const tileBase = cx(
  'relative flex size-14 shrink-0 items-center justify-center overflow-hidden',
  'rounded-[var(--radius-sm)] border border-border bg-bg text-muted'
)

export const attachmentThumbClass = tileBase

export const attachmentThumbImageClass = 'size-full object-cover'

export const attachmentThumbLabelClass =
  'absolute inset-x-0 bottom-0 truncate bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] px-1 text-center text-[0.6rem] leading-4 text-text'

export const attachmentThumbRemoveClass = cx(
  'absolute end-0.5 top-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full',
  'border-none bg-[color-mix(in_srgb,var(--color-text)_70%,transparent)] text-on-solid'
)

export const attachmentAddButtonClass = cx(
  tileBase,
  'cursor-pointer border-dashed transition-[border-color,color] duration-[var(--duration-fast)]',
  'hover:enabled:border-primary hover:enabled:text-primary disabled:cursor-not-allowed disabled:opacity-60'
)

/** «📎 N» next to a row's title; opens the viewer. */
export const attachmentBadgeClass = cx(
  'relative z-[1] inline-flex min-h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-border',
  'bg-bg px-1.5 align-middle text-[0.72rem] font-semibold text-muted hover:border-primary hover:text-primary'
)

export const attachmentViewerPreviewClass = cx(
  'flex min-h-40 items-center justify-center overflow-hidden rounded-[var(--radius-sm)]',
  'border border-border bg-bg text-muted'
)

export const attachmentViewerImageClass = 'max-h-[50vh] w-full object-contain'

export const attachmentViewerPdfClass = 'flex flex-col items-center gap-2 p-6 text-[0.85rem]'

export const attachmentViewerStripClass = 'mt-3 flex gap-2'

export const attachmentViewerStripItemClass = cx(
  tileBase,
  'cursor-pointer aria-[current=true]:border-2 aria-[current=true]:border-primary'
)

export const attachmentViewerActionsClass = 'mt-3 grid grid-cols-3 gap-2'

export const attachmentViewerNoteClass = 'mt-2 text-[0.78rem] text-muted'
