import { useMemo, useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import type { ConfirmableSms, SmsRecordInput } from '../../services/bankSmsApply'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import { getSettings } from '../../services/settings'
import { OTHER_CATEGORY } from '../../utils/categoryOrdering'
import { CategorySelect, FormField, PaymentSubCategoryField, Select } from '../form'
import Alert from '../ui/Alert'
import { smsActionsRowClass, smsBadgeClass, smsCardClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import type { WalletAccountWithRow } from '../wallet/types'

type BankSmsEntryCardProps = {
  entry: ReviewedSms
  probableDuplicate: boolean
  accounts: WalletAccountWithRow[]
  busy: boolean
  onConfirm: (entry: ConfirmableSms, record: SmsRecordInput | null) => void
  onDismiss: () => void
  /** Already entered by hand (record and balance): just drop it from the list. */
  onAlreadyRecorded: () => void
}

function resolveEntry(entry: ReviewedSms, accountId: string): ConfirmableSms | null {
  const { result, amount } = entry

  if (amount === null) return null
  if (result.kind === 'matched') return { ...entry, result, amount }
  if (result.kind !== 'ambiguous') return null

  const candidate = result.candidates.find(item => item.accountId === accountId)

  if (!candidate) return null

  const { direction, unit, balance, ref } = result

  return {
    ...entry,
    amount,
    result: { kind: 'matched', ...candidate, direction, unit, amount: result.amount, balance, ref }
  }
}

/** A recognised SMS (or one that fits several accounts) waiting for confirmation. */
export default function BankSmsEntryCard({
  entry,
  probableDuplicate,
  accounts,
  busy,
  onConfirm,
  onDismiss,
  onAlreadyRecorded
}: BankSmsEntryCardProps) {
  const { result } = entry
  const candidates = result.kind === 'ambiguous' ? result.candidates : []
  const [accountId, setAccountId] = useState(result.kind === 'matched' ? result.accountId : '')
  const resolved = useMemo(() => resolveEntry(entry, accountId), [entry, accountId])

  const direction =
    result.kind === 'matched' || result.kind === 'ambiguous' ? result.direction : 'debit'
  const type = direction === 'debit' ? 'expense' : 'income'
  const form = getSettings()?.forms.find(item => item.type === type)
  const categories = form?.fields.find(field => field.id === 'category')?.options ?? []
  const templateId = result.kind === 'matched' ? result.templateId : candidates[0]?.templateId
  const remembered = templateId ? getBankSmsPrefs().lastCategory[templateId] : undefined

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(remembered?.category ?? OTHER_CATEGORY)
  const [subCategory, setSubCategory] = useState(remembered?.subCategory ?? '')

  const account = accounts.find(item => item.id === (resolved?.result.accountId ?? accountId))
  const defaultTitle = `${account?.title ?? 'حساب'} — پیامک`

  const record = (): SmsRecordInput => ({
    title: title.trim() || defaultTitle,
    category,
    subCategory
  })

  return (
    <Card className={smsCardClass}>
      <BankSmsCardHead entry={entry} accountTitle={account?.title} />

      {entry.amount === null && (
        <Alert variant="warning">واحد پول اپ ریال یا تومان نیست؛ این پیامک قابل ثبت نیست.</Alert>
      )}

      {probableDuplicate && (
        <span className={smsBadgeClass}>احتمالاً تکراری — رکوردی با همین مبلغ و تاریخ هست</span>
      )}

      {candidates.length > 0 && (
        <FormField label="کدام حساب؟" required controlWidth="full">
          <Select
            value={accountId}
            onChange={setAccountId}
            aria-label="انتخاب حساب پیامک"
            options={[
              { value: '', label: 'انتخاب حساب', disabled: true },
              ...candidates.map(candidate => ({
                value: candidate.accountId,
                label: accounts.find(item => item.id === candidate.accountId)?.title ?? '—'
              }))
            ]}
          />
        </FormField>
      )}

      {resolved && (
        <>
          <FormField label="عنوان" controlWidth="full">
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder={defaultTitle}
            />
          </FormField>
          <FormField label="دسته‌بندی" required controlWidth="full">
            <CategorySelect
              value={category}
              onChange={next => {
                setCategory(next)
                setSubCategory('')
              }}
              categories={categories}
              formId={form?.id}
              allowManage={false}
              aria-label="دسته‌بندی تراکنش پیامکی"
            />
          </FormField>
          <PaymentSubCategoryField
            value={subCategory}
            onChange={setSubCategory}
            categoryType={type}
            category={category}
            ariaLabel="زیردسته تراکنش پیامکی"
          />
        </>
      )}

      <div className={smsActionsRowClass}>
        <Button
          type="button"
          size="sm"
          variant={direction === 'debit' ? 'outflow' : 'inflow'}
          disabled={!resolved || busy}
          loading={busy}
          onClick={() => resolved && onConfirm(resolved, record())}
        >
          {direction === 'debit' ? 'ثبت هزینه' : 'ثبت درآمد'}
        </Button>
        {resolved && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onConfirm(resolved, null)}
          >
            فقط به‌روزرسانی موجودی
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={onAlreadyRecorded}
        >
          قبلاً ثبت شده
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onDismiss}>
          نادیده
        </Button>
      </div>
    </Card>
  )
}
