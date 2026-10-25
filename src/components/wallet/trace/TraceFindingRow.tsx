import { useState } from 'react'
import { useNavigate } from 'react-router'

import { TRACE_KIND_LABELS } from './traceKinds'
import { getPathForTab } from '../../../routes/paths'
import { recordFocusPath } from '../../../routes/recordPaths'
import type { TraceFinding } from '../../../services/walletTraceTypes'
import { cn } from '../../../utils/cn'
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
  'inline-block rounded-full bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] px-2 py-px text-[0.66rem] font-semibold text-muted'

interface TraceFindingRowProps {
  finding: TraceFinding
  /** The user confirmed this one is fine; the row offers to take that back. */
  acked: boolean
  onToggleAck: (id: string) => void
}

/** One cause: tap to read why it counts and what to do about it. */
export default function TraceFindingRow({ finding, acked, onToggleAck }: TraceFindingRowProps) {
  const navigate = useNavigate()
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
          <DayBadge date={finding.date} />
        ) : (
          <span className={calmDayBadgeClass} aria-hidden="true">
            ؟
          </span>
        )}
        <span className={calmRowMainClass}>
          <span className={calmRowTitleClass}>{finding.title}</span>
          <span className={calmRowSubClass}>
            <span className={chipClass}>{TRACE_KIND_LABELS[finding.kind]}</span>
            {finding.certainty === 'likely' ? ' · احتمالی' : ''}
            {finding.accountTitle ? ` · ${finding.accountTitle}` : ''}
          </span>
        </span>
        <span className={calmRowEndClass}>
          <MoneyText amount={finding.effect} signed="plus" />
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 pb-3 ps-11">
          <p className="m-0 text-[0.78rem] leading-[1.8] text-muted">{finding.detail}</p>
          <div className="flex flex-wrap gap-2">
            {record ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
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
                onClick={() =>
                  navigate(getPathForTab('wallet-account-detail', { walletAccountId: accountId }), {
                    state: { title: finding.accountTitle }
                  })
                }
              >
                گردش حساب
              </Button>
            ) : null}
            {finding.group === 'suspect' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onToggleAck(finding.id)}
              >
                {acked ? 'برگرداندن به مظنون‌ها' : 'درست است، تأیید کردم'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}
