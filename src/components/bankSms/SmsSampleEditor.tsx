import { useMemo, useState } from 'react'

import SmsInboxPicker from './SmsInboxPicker'
import {
  SMS_DIRECTION_LABELS,
  SMS_ISSUE_LABELS,
  SMS_ROLE_LABELS,
  SMS_UNIT_LABELS
} from './smsLabels'
import SmsTokenChips from './SmsTokenChips'
import { guessTemplate, validateTemplateParts } from '../../services/bankSmsGuess'
import { matchSms } from '../../services/bankSmsMatch'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { normalizeSmsText, tokenizeSms } from '../../services/bankSmsText'
import type {
  SmsAmountUnit,
  SmsDirection,
  SmsSlotRole,
  SmsTemplate,
  SmsTemplatePart
} from '../../types'
import { formatMoney } from '../../utils/formatMoney'
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

export type SmsTemplateDraft = Pick<SmsTemplate, 'direction' | 'unit' | 'parts'>

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
  const [unit, setUnit] = useState<SmsAmountUnit | null>(null)

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
      guess ? { parts, direction: direction ?? guess.direction, unit: unit ?? guess.unit } : null,
    [guess, parts, direction, unit]
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
    setUnit(null)
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
          <ToggleChipGroup
            ariaLabel="واحد مبلغ در پیامک"
            options={(['rial', 'toman'] as const).map(id => ({ id, label: SMS_UNIT_LABELS[id] }))}
            selected={{ [draft.unit]: true }}
            onToggle={id => setUnit(id as SmsAmountUnit)}
          />

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
              <span>{formatMoney(preview.amount, preview.unit)}</span>
              <span className={smsPreviewLabelClass}>{SMS_ROLE_LABELS.balance}</span>
              <span>
                {preview.balance === null ? '—' : formatMoney(preview.balance, preview.unit)}
              </span>
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
