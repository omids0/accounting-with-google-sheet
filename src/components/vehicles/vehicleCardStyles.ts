import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentCardClass,
  interactiveCardClass,
  listCardInsetClass,
  walletItemCardClass
} from '../ui/featureCardStyles'

/** Vehicle cards — full-width horizontal layout on desktop. */
export const vehicleHorizontalCardsContainerClass = 'flex flex-col gap-3 [&_.list-card]:mb-0'

export const vehicleProfileCardClass = cn(installmentCardClass({}), walletItemCardClass)

export const vehicleHorizontalCardClass = cn(
  cardClassName,
  interactiveCardClass,
  'list-card wallet-item-card mb-0 overflow-hidden p-0'
)

export const vehicleHorizontalCardHeaderClass = cn(
  cardHeaderWithEditClass,
  'min-w-0 flex-1 lg:items-center'
)

export const vehicleHorizontalCardTapClass = cn(
  'block w-full min-w-0 flex-1 cursor-pointer rounded-sm border-none bg-transparent p-0 text-right text-inherit transition-[background] duration-[var(--duration-fast)]',
  listCardInsetClass,
  'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_45%,transparent)]'
)

export const vehicleHorizontalCardBodyClass = cn(
  vehicleHorizontalCardTapClass,
  'cursor-default hover:bg-transparent'
)

export const vehicleProfileCardContentClass = 'flex min-w-0 flex-col items-start gap-2'

export const vehicleHorizontalCardActionsClass = cardActionButtonsClass

export const vehicleHorizontalCardSideActionsClass = cn(
  'flex shrink-0 flex-wrap items-center gap-2 self-start p-2 m-2 ms-0 mt-2 lg:self-center'
)
