import type { LinkTargetState } from '../../hooks/useLinkTarget'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { sharesProblemMessage } from '../../utils/linkTargetFit'
import AmountInput from '../AmountInput'
import PickerSheet from '../form/PickerSheet'
import { alertClassName } from '../ui/Alert'
import Button from '../ui/Button'
import { dangCheckboxClass } from '../ui/featureCardStyles'
import { formActionsClassName, formErrorClass, formHintClass } from '../ui/formStyles'
import { formModalActionsClass } from '../ui/modalStyles'

type LinkSharesSheetProps = {
  link: LinkTargetState
  open: boolean
  onClose: () => void
}

/**
 * «پرداخت کدام بدهی‌ها؟»: every open debt (or receivable) with a tick; a ticked one shows the share
 * of the record's amount that pays it. The shares must add up to the record's amount, so «تأیید»
 * waits until they do.
 */
export default function LinkSharesSheet({ link, open, onClose }: LinkSharesSheetProps) {
  const { kind, options, shares: state, recordAmount, error } = link

  if (!kind?.multi) return null

  const { shares, placed, problem } = state
  const left = recordAmount - placed

  return (
    <PickerSheet
      open={open}
      title={kind.multi.sheetTitle}
      onClose={onClose}
      panelClassName="h-[min(80dvh,560px)]"
      subtitle={<p className={formHintClass}>{`مبلغ رکورد: ${formatMoney(recordAmount)}`}</p>}
      footer={
        <div className={cn(formModalActionsClass, 'flex flex-col gap-3')}>
          <div
            className={alertClassName(
              problem ? 'warning' : 'info',
              'mb-0 flex min-h-[4.5rem] w-full items-center'
            )}
            role="status"
            aria-live="polite"
          >
            {`${formatMoney(placed)} از ${formatMoney(recordAmount)} تقسیم شد`}
            {left > 0 && placed > 0 ? ` · ${formatMoney(left)} مانده` : ''}
            {left < 0 ? ` · ${formatMoney(-left)} بیشتر از مبلغ رکورد` : ''}
          </div>
          <div className={cn('flex', formActionsClassName())}>
            <Button type="button" onClick={onClose} disabled={Boolean(error)}>
              تأیید
            </Button>
          </div>
        </div>
      }
    >
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-0">
        {options.map(option => {
          const picked = option.id in shares
          const share = shares[option.id]

          const rowProblem =
            picked && problem && problem.kind !== 'sum' && problem.id === option.id
              ? sharesProblemMessage(problem, options)
              : ''

          return (
            <li
              key={option.id}
              onFocusCapture={event => event.currentTarget.scrollIntoView({ block: 'nearest' })}
              className={cn(
                'rounded-form border border-border p-2',
                picked &&
                  'border-primary bg-[color-mix(in_srgb,var(--color-accent-soft)_40%,var(--color-surface))]'
              )}
            >
              <label
                className="flex min-h-touch-min cursor-pointer items-center gap-3"
                aria-label={option.title}
              >
                <input
                  type="checkbox"
                  className={cn(dangCheckboxClass, 'mt-0')}
                  checked={picked}
                  onChange={() => state.toggle(option.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{option.title}</span>
                  <span className={cn(formHintClass, 'm-0 block')}>
                    {`باقی‌مانده ${formatMoney(option.remaining)}`}
                  </span>
                </span>
              </label>
              {picked ? (
                <div className="mt-1">
                  <AmountInput
                    compact
                    value={share}
                    onChange={value => state.setShare(option.id, value === '' ? 0 : value)}
                    invalid={Boolean(rowProblem)}
                    aria-invalid={Boolean(rowProblem)}
                    aria-label={`سهم «${option.title}»`}
                  />
                  {rowProblem ? <p className={formErrorClass}>{rowProblem}</p> : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </PickerSheet>
  )
}
