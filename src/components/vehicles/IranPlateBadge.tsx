import { useMemo } from 'react'

import { iranPlateBadgeSizeClass } from './iranPlateStyles'
import {
  EMPTY_IRAN_PLATE,
  formatIranPlateLabel,
  isEmptyPlate,
  parseIranPlate,
  type IranPlateParts
} from './iranPlateUtils'
import IranPlateVisual from './IranPlateVisual'
import { cn } from '../../utils/cn'

type IranPlateBadgeProps = {
  value: string
  compact?: boolean
  className?: string
}

export default function IranPlateBadge({ value, compact = true, className }: IranPlateBadgeProps) {
  const parsed = useMemo(() => parseIranPlate(value), [value])

  if (parsed.legacy) {
    return (
      <span className={cn('text-[0.82rem] font-bold text-text', className)}>{parsed.legacy}</span>
    )
  }

  const hasAny = Boolean(parsed.province || parsed.number || parsed.letter || parsed.serial)

  if (!hasAny) {
    return <span className={cn('text-[0.82rem] text-muted', className)}>—</span>
  }

  return (
    <div
      className={cn(compact && iranPlateBadgeSizeClass, className)}
      title={formatIranPlateLabel(value)}
    >
      <IranPlateVisual parts={parsed as IranPlateParts} compact={compact} />
    </div>
  )
}

export { isEmptyPlate, EMPTY_IRAN_PLATE }
