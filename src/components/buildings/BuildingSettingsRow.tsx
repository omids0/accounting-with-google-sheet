import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import {
  categoryChevronClass,
  categoryRowButtonClass,
  categoryRowClass,
  categoryRowMainClass,
  categoryRowMetaClass,
  categoryRowTitleClass
} from '../ui/categoryPageStyles'

export interface BuildingSettingsRowData {
  id: string
  title: string
  /** The line under the title: what is set now. */
  meta?: string
  /** The «بایگانی ساختمان» row is red. */
  danger?: boolean
  onClick: () => void
}

/** One row of the building settings: title, what it holds now, chevron. */
export default function BuildingSettingsRow({ row }: { row: BuildingSettingsRowData }) {
  return (
    <li className={categoryRowClass()}>
      <button type="button" className={categoryRowButtonClass} onClick={row.onClick}>
        <span className={categoryRowMainClass}>
          <span className={cn(categoryRowTitleClass, row.danger && 'text-danger')}>
            {row.title}
          </span>
          {row.meta ? <span className={categoryRowMetaClass}>{row.meta}</span> : null}
        </span>
        <AppIcon name="chevron-down" size={16} className={categoryChevronClass} />
      </button>
    </li>
  )
}
