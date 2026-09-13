import type { IranPlateParts } from './iranPlateUtils'
import './iranPlate.css'
import { cn } from '../../utils/cn'

type IranPlateVisualProps = {
  parts: IranPlateParts
  compact?: boolean
  className?: string
}

function PlateFlag() {
  return (
    <div className="iran-plate__flag" aria-hidden="true">
      <div className="iran-plate__flag-bars">
        <span className="iran-plate__flag-bar--green" />
        <span className="iran-plate__flag-bar--white" />
        <span className="iran-plate__flag-bar--red" />
      </div>
      <span className="iran-plate__flag-label">IR IRAN</span>
    </div>
  )
}

/** Real plate: flag (left) | ## X ### (center) | ایران / province (right) */
export default function IranPlateVisual({
  parts,
  compact = false,
  className
}: IranPlateVisualProps) {
  return (
    <div
      className={cn('iran-plate', compact && 'iran-plate--compact', className)}
      role="img"
      aria-label="پلاک خودرو"
    >
      <PlateFlag />

      <div className="iran-plate__main">
        <span className="iran-plate__segment" style={{ minWidth: compact ? '1.3rem' : '1.6rem' }}>
          {parts.serial || '—'}
        </span>
        <span className="iran-plate__letter">{parts.letter || '—'}</span>
        <span className="iran-plate__segment" style={{ minWidth: compact ? '2rem' : '2.4rem' }}>
          {parts.number || '—'}
        </span>
      </div>

      <div className="iran-plate__region">
        <span className="iran-plate__iran-label">ایران</span>
        <span className="iran-plate__province">{parts.province || '—'}</span>
      </div>
    </div>
  )
}
