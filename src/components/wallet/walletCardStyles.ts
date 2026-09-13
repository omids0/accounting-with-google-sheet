import { cn } from '../../utils/cn'

export const walletCardControllerGutterClass = 'pl-[3.35rem]'

export const walletBankCardClass = cn(
  'wallet-bank-card relative flex h-[6.35rem] w-full flex-col overflow-hidden rounded-[12px] p-[0.65rem_0.75rem]',
  walletCardControllerGutterClass,
  'text-right shadow-[0_5px_16px_rgba(0,0,0,0.2)] sm:h-[6.75rem] sm:p-[0.7rem_0.85rem] sm:pl-[3.35rem]',
  'transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
  'before:pointer-events-none before:absolute before:inset-0 before:opacity-90 before:content-[""]',
  'after:pointer-events-none after:absolute after:-right-[20%] after:-top-[30%] after:h-[70%] after:w-[55%] after:rounded-full after:bg-[rgba(255,255,255,0.06)] after:content-[""]'
)

export const walletBankCardTopRowClass = 'relative z-[1] flex items-start justify-between gap-2'

export const walletBankCardBrandClass = cn(
  'inline-flex max-w-[62%] items-center gap-[0.35rem] text-[0.66rem] font-bold leading-tight tracking-[-0.01em] sm:text-[0.7rem]'
)

export const walletBankCardLogoClass = cn(
  'inline-flex h-[1.35rem] min-w-[1.35rem] shrink-0 items-center justify-center rounded-full',
  'border border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.14)] px-[0.28rem] text-[0.52rem] font-extrabold'
)

export const walletBankCardChipClass = cn(
  'relative z-[1] mt-[0.2rem] h-[1.05rem] w-[1.45rem] shrink-0 rounded-[3px]',
  'border border-[rgba(255,255,255,0.35)] bg-[linear-gradient(145deg,#d4af37,#f0d060,#c9a227)]',
  'shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.15)]'
)

export const walletBankCardNumberWrapClass =
  'relative z-[1] flex min-h-0 flex-1 items-center justify-center px-0.5 py-0'

export const walletBankCardNumberCenterClass = cn(
  'w-full text-center font-mono text-[0.68rem] font-semibold tracking-[0.12em] tabular-nums sm:text-[0.74rem]',
  'font-numeric [font-feature-settings:"tnum"_1] [word-spacing:0.14em]'
)

export const walletBankCardBottomRowClass =
  'relative z-[1] mt-auto flex items-end justify-between gap-1.5 pt-[0.1rem] pe-[0.1rem]'

export const walletBankCardHolderClass =
  'min-w-0 truncate text-[0.6rem] font-medium opacity-90 sm:text-[0.64rem]'

export const walletBankCardBalanceClass = cn(
  'shrink-0 text-[0.82rem] font-extrabold tabular-nums font-numeric leading-none sm:text-[0.88rem]'
)

export const walletBankCardTitleClass =
  'mt-[0.1rem] truncate text-[0.56rem] font-medium opacity-75 sm:text-[0.6rem]'

export const walletBankCardContactlessClass = cn(
  'relative z-[1] opacity-80',
  '[&_svg]:h-[0.95rem] [&_svg]:w-[0.95rem]'
)

export const walletCardPreviewClass = 'mx-auto max-w-[18rem]'

export const walletCardsListClass = cn(
  'flex flex-col gap-1.5',
  'lg:grid lg:grid-cols-2 lg:gap-2 xl:grid-cols-3 [&_.list-card]:mb-0'
)

export const walletAccountCardShellClass = cn(
  'wallet-item-card list-card relative overflow-hidden p-0',
  '[content-visibility:auto] [contain-intrinsic-size:auto_6.75rem]'
)

export const walletAccountCardBodyClass = cn(
  'wallet-item-header block w-full cursor-pointer border-none bg-transparent p-0 text-right text-inherit',
  'transition-[background] duration-[var(--duration-fast)]',
  'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,transparent)]'
)

export const walletAccountCardVisualHostClass = 'relative min-w-0 p-1'

export const walletCardActionOverlayClass = cn(
  'wallet-card-action-overlay absolute top-1/2 left-2 z-20 flex -translate-y-1/2 flex-col gap-[0.1rem] rounded-[calc(var(--radius-sm)+1px)] p-[0.1rem]',
  'border border-[rgba(255,255,255,0.32)] bg-[rgba(15,23,42,0.28)] shadow-[0_4px_14px_rgba(0,0,0,0.22)]',
  'backdrop-blur-md backdrop-saturate-150',
  '[&_.card-action-btn]:h-[1.65rem] [&_.card-action-btn]:w-[1.65rem] [&_.card-action-btn]:rounded-md',
  '[&_.card-action-btn]:text-white/95 [&_.card-action-btn]:hover:enabled:bg-[rgba(255,255,255,0.16)]',
  '[&_.card-action-btn]:hover:enabled:text-white'
)

export const walletCardActionOverlayExpandedClass = cn(
  'border-[rgba(255,255,255,0.42)] bg-[rgba(15,23,42,0.34)] shadow-[0_8px_22px_rgba(0,0,0,0.26)]',
  '[&_.card-action-btn--expanded]:bg-[rgba(255,255,255,0.18)] [&_.card-action-btn--expanded]:text-white'
)

const walletTileBaseClass = cn(
  'relative flex h-[6.35rem] w-full flex-col justify-between overflow-hidden rounded-[12px] p-[0.65rem_0.75rem] text-right',
  walletCardControllerGutterClass,
  'shadow-[0_4px_14px_rgba(0,0,0,0.16)] sm:h-[6.75rem] sm:p-[0.7rem_0.85rem] sm:pl-[3.35rem]'
)

const walletTileTopRowClass = 'relative z-[2] flex items-start justify-between gap-2'

const walletTileBadgeClass = cn(
  'inline-flex items-center rounded-full border border-[rgba(255,255,255,0.22)] bg-[rgba(255,255,255,0.14)]',
  'px-[0.45rem] py-[0.1rem] text-[0.58rem] font-extrabold leading-none tracking-[0.02em]'
)

const walletTileTitleClass =
  'mt-[0.22rem] truncate text-[0.72rem] font-bold leading-tight opacity-95 sm:text-[0.76rem]'

const walletTileBottomRowClass = 'relative z-[2] flex items-end justify-between gap-2.5'

const walletTileNoteClass = 'min-w-0 truncate text-[0.58rem] font-medium leading-tight opacity-75'

const walletTileBalanceClass = cn(
  'shrink-0 text-[0.84rem] font-extrabold tabular-nums font-numeric leading-none sm:text-[0.88rem]'
)

const walletTileWatermarkClass = cn(
  'pointer-events-none absolute right-2 bottom-0 z-[1] text-[2.75rem] leading-none opacity-[0.16] select-none'
)

export const walletCashCardClass = cn(walletTileBaseClass, 'wallet-cash-card')

export const walletCashCardTopRowClass = walletTileTopRowClass
export const walletCashCardBadgeClass = walletTileBadgeClass
export const walletCashCardTitleClass = walletTileTitleClass
export const walletCashCardBottomRowClass = walletTileBottomRowClass
export const walletCashCardNoteClass = walletTileNoteClass
export const walletCashCardBalanceClass = walletTileBalanceClass
export const walletCashCardWatermarkClass = walletTileWatermarkClass

export const walletGenericCardClass = cn(walletTileBaseClass, 'wallet-generic-card')

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

export const walletColorInputClass = cn(
  'h-[2.5rem] w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--form-input-border)]',
  'bg-[var(--color-surface)] p-[0.15rem]',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
  'hover:enabled:border-[var(--form-input-border-hover)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]',
  'disabled:cursor-not-allowed disabled:opacity-45'
)

export const bluColorPickerBtnClass = cn(
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
