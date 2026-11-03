import { useState } from 'react'
import { useNavigate } from 'react-router'

import { INTEGRITY_KIND_LABELS } from './integrityKinds'
import { getPathForTab } from '../../../routes/paths'
import { recordFocusPath } from '../../../routes/recordPaths'
import type { IntegrityFinding } from '../../../services/integrityTypes'
import { cn } from '../../../utils/cn'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import {
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../../ui/calmListStyles'

const chipClass =
  'inline-block rounded-full bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] px-2 py-px text-[0.72rem] font-semibold text-muted'

/** One finding outside the account list: tap to read why it matters and where to look. */
export default function IntegrityFindingRow({ finding }: { finding: IntegrityFinding }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { recordId, recordType, transferId } = finding

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
        <span className={calmRowMainClass}>
          <span className={cn(calmRowTitleClass, open && 'whitespace-normal!')}>
            {finding.title}
          </span>
          <span className={calmRowSubClass}>
            <span className={chipClass}>{INTEGRITY_KIND_LABELS[finding.kind]}</span>
            {finding.severity === 'problem' ? ' · احتمالاً اشتباه' : ' · برای اطلاع'}
          </span>
        </span>
        {finding.amount !== undefined ? (
          <span className={calmRowEndClass}>
            <bdi>
              <MoneyText amount={finding.amount} />
            </bdi>
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-90')}
        >
          ‹
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 pb-3 ps-1">
          <p className="m-0 text-[0.82rem] leading-[1.9] text-muted">{finding.detail}</p>
          <div className="flex flex-wrap gap-2">
            {recordId && recordType ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11"
                onClick={() => navigate(recordFocusPath(recordType, recordId, true))}
              >
                ویرایش رکورد
              </Button>
            ) : null}
            {transferId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11"
                onClick={() => navigate(getPathForTab('wallet-transfers'))}
              >
                دیدن انتقال‌ها
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}
