import type { ReactNode } from 'react'

import { formatPersianNumber } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import {
  closeYearMarkClass,
  closeYearStepBodyClass,
  closeYearStepClass,
  closeYearStepHintClass,
  closeYearStepTitleClass
} from '../ui/closeYearStyles'

interface CloseYearStepRowProps {
  /** 1-based position, shown while the step is pending. */
  index: number
  done: boolean
  title: string
  hint: ReactNode
  children?: ReactNode
}

/** One step of «بستن سال»: ✓ when done, its number otherwise; nothing blocks the next one. */
export default function CloseYearStepRow({
  index,
  done,
  title,
  hint,
  children
}: CloseYearStepRowProps) {
  return (
    <li className={closeYearStepClass}>
      <span className={closeYearMarkClass(done)} aria-hidden="true">
        {done ? <AppIcon name="check" size={16} /> : formatPersianNumber(index)}
      </span>
      <div className={closeYearStepBodyClass}>
        <h3 className={closeYearStepTitleClass}>
          {title}
          <span className="sr-only">{done ? ' — انجام شد' : ' — مانده'}</span>
        </h3>
        <p className={closeYearStepHintClass}>{hint}</p>
        {children}
      </div>
    </li>
  )
}
