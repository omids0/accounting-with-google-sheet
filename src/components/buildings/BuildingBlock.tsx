import { cn } from '../../utils/cn'
import CalmBlock, { type CalmBlockProps } from '../CalmBlock'
import { buildingBlockClass } from '../ui/buildingStyles'

/** `CalmBlock` for a building page: a 16px title and a 44px «همه ›» link on phones. */
export default function BuildingBlock({ className, ...rest }: CalmBlockProps) {
  return <CalmBlock {...rest} className={cn(buildingBlockClass, className)} />
}
