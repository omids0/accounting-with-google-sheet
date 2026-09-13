import { cn } from '../../utils/cn'
import { interactiveCardClass } from '../ui/featureCardStyles'

/** Vehicle cards — full-width horizontal layout on desktop. */
export const vehicleHorizontalCardsContainerClass = 'flex flex-col gap-3 [&_.list-card]:mb-0'

export const vehicleHorizontalCardClass = cn(
  interactiveCardClass,
  'list-card flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:p-4'
)

export const vehicleHorizontalCardMainClass = 'min-w-0 flex-1'

export const vehicleHorizontalCardActionsClass =
  'flex shrink-0 flex-wrap items-center justify-end gap-2 lg:min-w-[12rem]'
