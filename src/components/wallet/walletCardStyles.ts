import { cn, cx } from '../../utils/cn'

/** Room for the 2x2 grid of 44 px action buttons on the card's left edge. */
export const walletCardControllerGutterClass = 'pl-[6.6rem]'

const walletCardShadowClass =
  'shadow-[0_2px_8px_rgba(15,23,42,0.1),0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.06]'

export const walletBankCardClass = cx(
  'wallet-bank-card relative flex min-h-[6.35rem] w-full flex-col overflow-hidden rounded-[12px] p-[0.65rem_0.75rem]',
  walletCardControllerGutterClass,
  walletCardShadowClass,
  'text-right sm:min-h-[6.75rem] sm:p-[0.7rem_0.85rem] sm:pl-[6.6rem]',
  'transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)]'
)

export const walletBankCardTopRowClass = 'relative z-[1] flex items-start justify-between gap-2'

export const walletBankCardBrandClass = cx(
  'inline-flex max-w-[62%] items-center gap-[0.35rem] text-[0.6875rem] font-bold leading-tight tracking-[-0.01em] sm:text-[0.72rem]'
)

export const walletBankCardLogoClass = cx(
  'inline-flex h-[1.35rem] min-w-[1.35rem] shrink-0 items-center justify-center rounded-full',
  'border border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.14)] px-[0.28rem] text-[0.6875rem] font-extrabold'
)

export const walletBankCardChipClass = cx(
  'relative z-[1] h-[1.05rem] w-[1.45rem] shrink-0 rounded-[3px]',
  'border border-[rgba(255,255,255,0.35)] bg-[linear-gradient(145deg,#d4af37,#f0d060,#c9a227)]',
  'shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.15)]'
)

export const walletBankCardTopLeftClass =
  'relative z-[1] flex shrink-0 flex-col items-start gap-[0.22rem]'

export const walletBankCardNumberWrapClass =
  'relative z-[1] flex min-h-0 flex-1 items-center justify-center px-0.5 py-0'

export const walletBankCardNumberCenterClass = cn(
  'w-full text-center font-mono text-[0.75rem] font-semibold tracking-[0.12em] tabular-nums sm:text-[0.8rem]',
  'font-numeric [font-feature-settings:"tnum"_1] [word-spacing:0.14em]'
)

export const walletBankCardBottomRowClass =
  'relative z-[1] mt-auto flex items-end justify-between gap-1.5 pt-[0.1rem] pe-[0.1rem]'

export const walletBankCardHolderClass =
  'min-w-0 truncate text-[0.6875rem] font-medium opacity-90 sm:text-[0.72rem]'

export const walletBankCardBalanceClass = cx(
  'shrink-0 text-[0.82rem] font-extrabold tabular-nums font-numeric leading-none sm:text-[0.88rem]'
)

export const walletBankCardTitleClass =
  'mt-[0.1rem] truncate text-[0.6875rem] font-medium opacity-90 sm:text-[0.72rem]'

export const walletBankCardContactlessClass = cx(
  'relative z-[1] opacity-80',
  '[&_svg]:h-[0.95rem] [&_svg]:w-[0.95rem]'
)

export const walletCardPreviewClass = 'mx-auto max-w-[18rem]'

export const walletBankCardCopyBtnClass = cx(
  // 44 px hit box around the 16 px icon; negative margins keep the row height unchanged.
  'copy-btn relative z-[1] -my-[0.9rem] inline-flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center',
  'rounded-[3px] border-none bg-transparent p-0 text-inherit opacity-90',
  'transition-opacity duration-[var(--duration-fast)] hover:opacity-100',
  // Bank cards carry white text, so a white ring matches its contrast.
  'focus-visible:opacity-100 [--focus-ring:#fff]',
  '[&_svg]:h-[0.9rem] [&_svg]:w-[0.9rem]'
)

export const walletBankCardExtraInfoClass =
  'relative z-[1] flex flex-wrap items-center gap-x-[0.6rem] gap-y-[0.15rem] pb-[0.1rem]'

export const walletBankCardExtraInfoItemClass =
  'inline-flex min-w-0 items-center gap-[0.25rem] text-[0.6875rem] font-medium opacity-90 sm:text-[0.72rem]'

export const walletCardsListClass = cx(
  'flex flex-col gap-2',
  'md:grid md:grid-cols-2 md:gap-2 xl:grid-cols-3 [&_.list-card]:mb-0'
)

export const walletAccountCardShellClass = cx(
  'wallet-item-card list-card relative overflow-visible border-0 bg-transparent p-0 shadow-none',
  '[content-visibility:auto] [contain-intrinsic-size:auto_6.75rem]'
)

export const walletAccountCardBodyClass = cx(
  'wallet-item-header block w-full cursor-pointer border-none bg-transparent p-0 text-right text-inherit',
  'transition-[background] duration-[var(--duration-fast)]',
  'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,transparent)]'
)

export const walletAccountCardVisualHostClass = 'relative min-w-0 p-0'

export const walletCardActionOverlayClass = cx(
  'wallet-card-action-overlay absolute top-1/2 left-2 z-20 grid -translate-y-1/2 grid-cols-2 gap-[0.1rem] rounded-[calc(var(--radius-sm)+1px)] p-[0.1rem]',
  // No per-card backdrop blur (one offscreen blur pass per wallet card); a
  // slightly denser tint keeps the buttons legible instead.
  // Dense enough that white icons keep 3:1 even on the yellow and rose cards.
  'border border-[rgba(255,255,255,0.32)] bg-[rgba(15,23,42,0.72)] shadow-[0_4px_14px_rgba(0,0,0,0.22)]',
  '[&_.card-action-btn]:rounded-md',
  '[&_.card-action-btn]:text-white/95 [&_.card-action-btn]:hover:enabled:bg-[rgba(255,255,255,0.16)]',
  '[&_.card-action-btn]:hover:enabled:text-white'
)

export const walletCardActionOverlayExpandedClass = cx(
  'border-[rgba(255,255,255,0.42)] bg-[rgba(15,23,42,0.8)] shadow-[0_8px_22px_rgba(0,0,0,0.26)]',
  '[&_.card-action-btn--expanded]:bg-[rgba(255,255,255,0.18)] [&_.card-action-btn--expanded]:text-white'
)

const walletTileBaseClass = cx(
  'relative flex h-[6.35rem] w-full flex-col justify-between overflow-hidden rounded-[12px] p-[0.65rem_0.75rem] text-right',
  walletCardControllerGutterClass,
  walletCardShadowClass,
  'sm:h-[6.75rem] sm:p-[0.7rem_0.85rem] sm:pl-[6.6rem]'
)

const walletTileTopRowClass = 'relative z-[2] flex items-start justify-between gap-2'

const walletTileBadgeClass = cx(
  'inline-flex items-center rounded-full border border-[rgba(255,255,255,0.22)] bg-[rgba(255,255,255,0.14)]',
  'px-[0.45rem] py-[0.1rem] text-[0.6875rem] font-extrabold leading-none tracking-[0.02em]'
)

const walletTileTitleClass =
  'mt-[0.22rem] truncate text-[0.72rem] font-bold leading-tight opacity-95 sm:text-[0.76rem]'

const walletTileBottomRowClass = 'relative z-[2] flex items-end justify-between gap-2.5'

const walletTileNoteClass = 'min-w-0 truncate text-[0.6875rem] font-medium leading-tight opacity-90'

const walletTileBalanceClass = cx(
  'shrink-0 text-[0.84rem] font-extrabold tabular-nums font-numeric leading-none sm:text-[0.88rem]'
)

const walletTileWatermarkClass = cx(
  'pointer-events-none absolute right-2 bottom-0 z-[1] text-[2.75rem] leading-none opacity-[0.16] select-none'
)

export const walletCashCardClass = cx(walletTileBaseClass, 'wallet-cash-card')

export const walletCashCardTopRowClass = walletTileTopRowClass
export const walletCashCardBadgeClass = walletTileBadgeClass
export const walletCashCardTitleClass = walletTileTitleClass
export const walletCashCardBottomRowClass = walletTileBottomRowClass
export const walletCashCardNoteClass = walletTileNoteClass
export const walletCashCardBalanceClass = walletTileBalanceClass
export const walletCashCardWatermarkClass = walletTileWatermarkClass

export const walletGenericCardClass = cx(walletTileBaseClass, 'wallet-generic-card')

export const walletGenericCardTopRowClass = walletTileTopRowClass
export const walletGenericCardBadgeClass = walletTileBadgeClass
export const walletGenericCardTitleClass = walletTileTitleClass
export const walletGenericCardBottomRowClass = walletTileBottomRowClass
export const walletGenericCardNoteClass = walletTileNoteClass
export const walletGenericCardBalanceClass = walletTileBalanceClass
export const walletGenericCardWatermarkClass = walletTileWatermarkClass

export const bluColorPickerLabelClass =
  'mb-[0.45rem] text-[0.72rem] font-bold text-[var(--form-label-color)]'

export const bluColorPickerGridClass = 'flex flex-wrap items-center gap-[0.55rem]'

export const walletColorInputClass = cx(
  'h-[2.5rem] w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--form-input-border)]',
  'bg-[var(--color-surface)] p-[0.15rem]',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
  'hover:enabled:border-[var(--form-input-border-hover)]',
  'disabled:cursor-not-allowed disabled:opacity-45'
)

export const bluColorPickerBtnClass = cx(
  'blu-color-picker-btn h-[2rem] w-[2rem] shrink-0 cursor-pointer rounded-full border-2 border-transparent',
  'shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.12)]',
  'transition-[transform,box-shadow,border-color] duration-[var(--duration-fast)]',
  'hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_4px_10px_rgba(0,0,0,0.18)]',
  'disabled:cursor-not-allowed disabled:opacity-45',
  '[&.blu-color-picker-btn--selected]:border-[color-mix(in_srgb,var(--color-primary)_70%,#fff)]',
  '[&.blu-color-picker-btn--selected]:ring-2',
  '[&.blu-color-picker-btn--selected]:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]',
  '[&.blu-color-picker-btn--selected]:scale-110'
)

/** Covers the whole card header so any tap toggles it. */
export const walletOpeningToggleClass =
  'focus-ring-inset absolute inset-0 z-0 cursor-pointer rounded-[inherit] border-none bg-transparent p-0'

export const walletOpeningHintClass = 'relative z-[1]'
