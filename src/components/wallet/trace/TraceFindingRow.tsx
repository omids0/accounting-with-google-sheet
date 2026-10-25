import { useState } from 'react'
import { useNavigate } from 'react-router'

import { TRACE_KIND_LABELS } from './traceKinds'
import { maskAmountsInText } from './traceMask'
import { useIsAmountsHidden } from '../../../hooks/useAmountsHidden'
import { getPathForTab } from '../../../routes/paths'
import { recordFocusPath } from '../../../routes/recordPaths'
import type { TraceFinding } from '../../../services/walletTraceTypes'
import { cn } from '../../../utils/cn'
import { formatIsoDatePersian } from '../../../utils/jalaliDate'
import DayBadge from '../../DayBadge'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import {
  calmDayBadgeClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../../ui/calmListStyles'

const chipClass =
  'inline-block rounded-full bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] px-2 py-px text-[0.72rem] font-semibold text-muted'

const actionClass = 'min-h-11'

interface TraceFindingRowProps {
  finding: TraceFinding
  /** The user confirmed this one is fine; the row offers to take that back. */
  acked: boolean
  onToggleAck: (id: string) => void
}

/** One cause: tap to read why it counts and what to do about it. */
export default function TraceFindingRow({ finding, acked, onToggleAck }: TraceFindingRowProps) {
  const navigate = useNavigate()
  const hidden = useIsAmountsHidden()
  const [open, setOpen] = useState(false)
  const { record, accountId } = finding

  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        className={cn(
          calmRowClass,
          'w-full cursor-pointer border-0 bg-transparent p-0 text-start first:border-t-0'
        )}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {finding.date ? (
          <DayBadge date={finding.date} showMonth />
        ) : (
          <span className={calmDayBadgeClass} aria-hidden="true">
            —
          </span>
        )}
        <span className={calmRowMainClass}>
          <span className={cn(calmRowTitleClass, open && 'whitespace-normal!')}>
            {maskAmountsInText(finding.title, hidden)}
          </span>
          <span className={calmRowSubClass}>
            <span className={chipClass}>{TRACE_KIND_LABELS[finding.kind]}</span>
            {finding.certainty === 'likely' ? ' · حدسی' : ''}
            {finding.accountTitle ? ` · ${finding.accountTitle}` : ''}
            {finding.date ? ` · ${formatIsoDatePersian(finding.date)}` : ''}
          </span>
        </span>
        <span className={calmRowEndClass}>
          <MoneyText amount={finding.effect} signed="plus" />
        </span>
        <span
          aria-hidden="true"
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-90')}
        >
          ‹
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 pb-3 ps-11">
          <p className="m-0 text-[0.82rem] leading-[1.9] text-muted">
            {maskAmountsInText(finding.detail, hidden)}
          </p>
          <div className="flex flex-wrap gap-2">
            {record ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={actionClass}
                onClick={() => navigate(recordFocusPath(record.type, record.id, true))}
              >
                ویرایش رکورد
              </Button>
            ) : null}
            {accountId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={actionClass}
                onClick={() =>
                  navigate(getPathForTab('wallet-account-detail', { walletAccountId: accountId }), {
                    state: { title: finding.accountTitle }
                  })
                }
              >
                تاریخچهٔ حساب
              </Button>
            ) : null}
            {finding.group === 'suspect' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn(actionClass, 'ms-auto')}
                onClick={() => onToggleAck(finding.id)}
              >
                {acked ? 'برگرداندن به فهرست اول' : 'درست است، تأیید کردم'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}
