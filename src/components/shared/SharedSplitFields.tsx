import { splitPreview } from './sharedViewModel'
import { formatMoney } from '../../utils/formatMoney'
import { FormField, Select, SegmentedRadio } from '../form'
import type { SharedSplit } from '../form/sharedFields'
import { alertClassName } from '../ui/Alert'
import { formFieldClass, formLabelClass } from '../ui/formStyles'
import { sharedAlertClass } from '../ui/sharedStyles'

interface SharedSplitFieldsProps {
  /** The owner and the partner; one e-mail while no partner has joined. */
  people: string[]
  me: string
  nameOf: (email: string) => string
  /**
   * A partner existed and is gone (the balance still names them). False: nobody has joined yet.
   * Left out: not known here, so the hint fits both.
   */
  former?: boolean
  amount: number
  payer: string
  split: SharedSplit
  onPayer: (email: string) => void
  onSplit: (split: SharedSplit) => void
}

/**
 * The expense part of the shared add sheet: «چه کسی پرداخت کرد؟», «برای چه کسی است؟»
 * (نصف‌نصف / فقط من / فقط X) and each person's share, live, by the balance's own rule.
 */
export default function SharedSplitFields({
  people,
  me,
  nameOf,
  former,
  amount,
  payer,
  split,
  onPayer,
  onSplit
}: SharedSplitFieldsProps) {
  const options = [
    { value: 'equal' as SharedSplit, label: 'نصف‌نصف' },
    ...people.map(email => ({
      value: `only:${email}` as SharedSplit,
      label: email === me ? 'فقط من' : `فقط ${nameOf(email)}`
    }))
  ]

  const pair: [string, string] | null = people.length === 2 ? [people[0], people[1]] : null

  const preview = !pair
    ? former === false
      ? 'تا شریک به حساب نپیوسته، هزینه فقط به نام شما ثبت می‌شود.'
      : 'شریکی در این حساب نیست؛ هزینه فقط به نام شما ثبت می‌شود.'
    : amount > 0
    ? splitPreview(amount, split, pair, payer)
        .map(part => `سهم ${nameOf(part.email)}: ${formatMoney(part.share)}`)
        .join(' · ')
    : 'مبلغ را وارد کنید تا سهم هر نفر را ببینید.'

  return (
    <>
      <FormField label="چه کسی پرداخت کرد؟" controlWidth="full">
        <Select
          aria-label="چه کسی پرداخت کرد؟"
          value={payer}
          onChange={onPayer}
          options={people.map(email => ({ value: email, label: nameOf(email) }))}
        />
      </FormField>
      {pair ? (
        <div className={formFieldClass}>
          <span className={formLabelClass} aria-hidden="true">
            برای چه کسی است؟
          </span>
          <SegmentedRadio
            label="برای چه کسی است؟"
            options={options}
            value={split}
            onChange={onSplit}
          />
        </div>
      ) : null}
      <p className={alertClassName('info', sharedAlertClass)} role="status" aria-live="polite">
        {preview}
      </p>
    </>
  )
}
