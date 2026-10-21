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
  /** A row that opens an outside page (the Google Sheets file) instead of a sheet of the app. */
  href?: string
  /** The link text shown under the meta of an `href` row. */
  linkLabel?: string
  onClick?: () => void
}

/** One row of the building settings: title, what it holds now, chevron (or an outside link). */
export default function BuildingSettingsRow({ row }: { row: BuildingSettingsRowData }) {
  const body = (
    <>
      <span className={categoryRowMainClass}>
        <span className={cn(categoryRowTitleClass, 'text-base', row.danger && 'text-danger')}>
          {row.title}
        </span>
        {/* What is set now can be long («شارژ ماهانه … صدور … سررسید …»): it wraps, 14px. */}
        {row.meta ? (
          <span className={cn(categoryRowMetaClass, 'whitespace-normal text-sm')}>{row.meta}</span>
        ) : null}
        {row.href && row.linkLabel ? (
          <span className="text-sm font-medium text-primary">{row.linkLabel}</span>
        ) : null}
      </span>
      <AppIcon
        name={row.href ? 'external' : 'chevron-down'}
        size={16}
        className={categoryChevronClass}
      />
    </>
  )

  return (
    <li className={categoryRowClass()}>
      {row.href ? (
        <a
          className={categoryRowButtonClass}
          href={row.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {body}
        </a>
      ) : (
        <button type="button" className={categoryRowButtonClass} onClick={row.onClick}>
          {body}
        </button>
      )}
    </li>
  )
}
