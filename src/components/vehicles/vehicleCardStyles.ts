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
