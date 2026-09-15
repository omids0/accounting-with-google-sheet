import { cn } from '../../utils/cn'
import {
  cardActionButtonsClass,
  installmentCardClass,
  walletItemCardClass
} from '../ui/featureCardStyles'
import { recordsToolbarClass } from '../ui/recordsStyles'

/** Vehicle cards — full-width horizontal layout on desktop. */
export const vehicleHorizontalCardsContainerClass = 'flex flex-col gap-3 [&_.list-card]:mb-0'

export const vehicleDetailToolbarClass = cn(recordsToolbarClass, 'p-3')

export const vehicleDetailMileageClass = 'm-0 mb-2.5 text-[0.78rem] leading-snug text-muted'

export const vehicleDetailMileageValueClass =
  'font-extrabold tabular-nums text-primary-dark font-numeric'

export const vehicleProfileCardClass = cn(installmentCardClass({}), walletItemCardClass)

export const vehicleHorizontalCardClass = cn(installmentCardClass({}), walletItemCardClass, 'mb-0')

export const vehicleProfileCardContentClass = 'flex min-w-0 flex-col items-start gap-2'

export const vehicleHorizontalCardActionsClass = cardActionButtonsClass

export const fuelReportSectionTitleClass =
  'mb-2.5 flex items-center gap-2 text-[0.82rem] font-bold text-foreground'

export const fuelReportSectionAccentClass = 'h-4 w-1 shrink-0 rounded-full bg-expense/70'

export const fuelPriceCardsGridClass = 'mb-4 grid gap-2.5 sm:grid-cols-2'

export const fuelPriceCardClass = cn(
  'relative overflow-hidden rounded-2xl border border-expense/25 bg-gradient-to-br from-expense/10 via-card to-card px-4 py-3',
  'shadow-[0_1px_0_color-mix(in_srgb,var(--color-expense)_18%,transparent)]'
)

export const fuelPriceCardRateClass = 'text-[1.02rem] font-extrabold tabular-nums text-expense'

export const fuelPriceCardMetaRowClass =
  'mt-2.5 flex items-center justify-between gap-2 border-t border-expense/15 pt-2 text-[0.78rem]'

export const fuelEntryListClass = 'flex flex-col gap-2.5'

export const fuelEntryCardClass = cn(
  'rounded-2xl border border-border/70 bg-muted/15 px-4 py-3',
  'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]'
)

export const fuelEntryDateBadgeClass =
  'rounded-full bg-primary/12 px-2.5 py-0.5 text-[0.76rem] font-semibold text-primary-dark'

export const fuelEntryStatsGridClass = 'mt-2.5 grid grid-cols-3 gap-2 text-center'

export const fuelEntryStatBoxClass = 'rounded-xl bg-card/80 px-2 py-1.5'

export const fuelEntryStatLabelClass = 'text-[0.68rem] text-muted'

export const fuelEntryStatValueClass = 'mt-0.5 text-[0.84rem] font-bold tabular-nums'
