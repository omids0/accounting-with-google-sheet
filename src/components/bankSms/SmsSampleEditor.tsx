import { useMemo, useState } from 'react'

import SmsInboxPicker from './SmsInboxPicker'
import {
  SMS_DIRECTION_LABELS,
  SMS_ISSUE_LABELS,
  SMS_ROLE_LABELS,
  SMS_UNIT_LABELS
} from './smsLabels'
import SmsTokenChips from './SmsTokenChips'
import { toAppCurrency } from '../../services/bankSmsAmount'
import { guessTemplate, validateTemplateParts } from '../../services/bankSmsGuess'
import { matchSms, sampleRefDigits } from '../../services/bankSmsMatch'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { normalizeSmsText, tokenizeSms } from '../../services/bankSmsText'
import type { SmsDirection, SmsSlotRole, SmsTemplate, SmsTemplatePart } from '../../types'
import { formatMoney, getCurrency, getCurrencySymbol } from '../../utils/formatMoney'
import ToggleChipGroup from '../ToggleChipGroup'
import {
  smsActionsRowClass,
  smsHintClass,
  smsIssueListClass,
  smsPreviewClass,
  smsPreviewLabelClass,
  smsTextareaClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'

export type SmsTemplateDraft = Pick<SmsTemplate, 'direction' | 'unit' | 'parts'> & {
  /** Card/account digits shown in the sample, so its account is learned on save. */
  sampleRef?: string
}

type SmsSampleEditorProps = {
  /** Templates already saved anywhere; they teach the guesser. */
  learned: SmsTemplate[]
  initialText?: string
  saving?: boolean
  onSave: (draft: SmsTemplateDraft) => void | Promise<void>
  onCancel: () => void
}

const PREVIEW_ID = 'preview'

export default function SmsSampleEditor({
  learned,
  initialText = '',
  saving = false,
  onSave,
  onCancel
}: SmsSampleEditorProps) {
  const [text, setText] = useState(initialText)
  const [roles, setRoles] = useState<Record<number, SmsSlotRole>>({})
  const [direction, setDirection] = useState<SmsDirection | null>(null)

  const normalized = useMemo(() => normalizeSmsText(text), [text])
  const tokens = useMemo(() => tokenizeSms(normalized), [normalized])
  const guess = useMemo(
    () => (normalized ? guessTemplate(normalized, learned) : null),
    [normalized, learned]
  )

  const parts: SmsTemplatePart[] = useMemo(
    () =>
      (guess?.parts ?? []).map((part, index) =>
        part.kind === 'slot' && roles[index] ? { ...part, role: roles[index] } : part
      ),
    [guess, roles]
  )

  const draft: SmsTemplateDraft | null = useMemo(
    () =>
      guess
        ? {
            parts,
            direction: direction ?? guess.direction,
            // Read from the SMS text itself («تومان» or not); converted to the app unit on save.
            unit: guess.unit,
            sampleRef: sampleRefDigits(parts, normalized)
          }
        : null,
    [guess, parts, direction, normalized]
  )

  const issues = draft ? validateTemplateParts(draft.parts) : []

  const preview = useMemo(() => {
    if (!draft || issues.length) return null

    const template = { ...draft, id: PREVIEW_ID, createdAt: '', accountId: PREVIEW_ID }
    const account = { id: PREVIEW_ID, cardNumber: '', accountNumber: '', iban: '' }
    const result = matchSms(normalized, [template], [account])

    return result.kind === 'matched' ? result : null
  }, [draft, issues.length, normalized])

  const changeText = (next: string) => {
    setText(next)
    setRoles({})
    setDirection(null)
  }

  const inApp = (value: number) => {
    const converted = draft ? toAppCurrency(value, draft.unit, getCurrency()) : null

    return converted === null ? formatMoney(value, draft?.unit) : formatMoney(converted)
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className={smsTextareaClass}
        value={text}
        onChange={event => changeText(event.target.value)}
        placeholder="متن کامل یک پیامک بانکی این حساب را اینجا بچسبانید"
        aria-label="متن پیامک نمونه"
      />

      {isBankSmsAvailable() && <SmsInboxPicker onPick={changeText} />}

      {draft && (
        <>
          <p className={smsHintClass}>
            روی هر عدد بزنید تا نقشش عوض شود: مبلغ ← مانده ← کارت/حساب ← نادیده.
          </p>
          <SmsTokenChips
            tokens={tokens}
            parts={draft.parts}
            onRoleChange={(index, role) => setRoles(prev => ({ ...prev, [index]: role }))}
          />

          <ToggleChipGroup
            ariaLabel="نوع تراکنش"
            options={(['debit', 'credit'] as const).map(id => ({
              id,
              label: SMS_DIRECTION_LABELS[id]
            }))}
            selected={{ [draft.direction]: true }}
            onToggle={id => setDirection(id as SmsDirection)}
          />
          <p className={smsHintClass}>
            مبلغ این پیامک به {SMS_UNIT_LABELS[draft.unit]} است
            {draft.unit !== getCurrency() &&
              ` و هنگام ثبت خودکار به ${getCurrencySymbol()} تبدیل می‌شود`}
            .
          </p>

          {issues.length > 0 && (
            <ul className={smsIssueListClass}>
              {issues.map(issue => (
                <li key={issue}>{SMS_ISSUE_LABELS[issue]}</li>
              ))}
            </ul>
          )}

          {preview && (
            <div className={smsPreviewClass} aria-label="نتیجه خواندن پیامک">
              <span className={smsPreviewLabelClass}>{SMS_ROLE_LABELS.amount}</span>
              <span>{inApp(preview.amount)}</span>
              <span className={smsPreviewLabelClass}>{SMS_ROLE_LABELS.balance}</span>
              <span>{preview.balance === null ? '—' : inApp(preview.balance)}</span>
            </div>
          )}
        </>
      )}

      <div className={smsActionsRowClass}>
        <Button
          type="button"
          size="sm"
          disabled={!draft || issues.length > 0}
          loading={saving}
          onClick={() => draft && onSave(draft)}
        >
          ذخیره قالب
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
