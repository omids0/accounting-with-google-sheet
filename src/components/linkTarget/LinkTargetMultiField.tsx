import { lazy, Suspense, useState } from 'react'

import type { LinkTargetState } from '../../hooks/useLinkTarget'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import FormField from '../form/FormField'
import {
  customSelectChevronClass,
  customSelectRootClass,
  customSelectTriggerClass,
  customSelectTriggerStateClass,
  customSelectValueClass
} from '../ui/formControlStyles'

/** The sheet loads when the user opens it: the field itself stays as light as a select. */
const LinkSharesSheet = lazy(() => import('./LinkSharesSheet'))

type LinkTargetMultiFieldProps = {
  link: LinkTargetState
  disabled?: boolean
}

/**
 * The picker of a record that may pay several debts (or receivables): one trigger the height of
 * a select, in every state, so the card does not jump. It opens a sheet where each item is ticked
 * and given its share; the trigger then tells how many were picked and how much they take.
 */
export default function LinkTargetMultiField({
  link,
  disabled = false
}: LinkTargetMultiFieldProps) {
  const [open, setOpen] = useState(false)
  const { kind, options, loading, expectEmpty, error, shares } = link

  if (!kind?.multi) return null

  const empty = !loading && options.length === 0
  const count = shares.picks.length

  const label = loading
    ? 'در حال خواندن…'
    : count
    ? error
      ? `${toPersianDigits(String(count))} ${kind.noun} · جمع سهم‌ها درست نیست`
      : `${kind.multi.summary(count)} · ${formatMoney(shares.placed)}`
    : kind.noneLabel

  const off = disabled || loading || empty

  return (
    <FormField
      label={kind.fieldLabel}
      controlWidth="full"
      hint={empty || expectEmpty ? kind.emptyHint : undefined}
    >
      <div className={customSelectRootClass({ open })}>
        <button
          type="button"
          className={cn(
            customSelectTriggerClass,
            customSelectTriggerStateClass({ open, disabled: off, invalid: Boolean(error) }),
            'h-auto min-h-touch-min py-1.5'
          )}
          onClick={() => !off && setOpen(true)}
          disabled={off}
          aria-label={`${kind.fieldLabel} ${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={cn(customSelectValueClass, !count && 'text-muted')}>{label}</span>
          <AppIcon
            name="chevron-down"
            size={12}
            className={customSelectChevronClass(open)}
            aria-hidden
          />
        </button>
      </div>
      {open ? (
        <Suspense fallback={null}>
          <LinkSharesSheet link={link} open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </FormField>
  )
}
