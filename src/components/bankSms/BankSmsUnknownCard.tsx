import { useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import SmsSampleEditor, { type SmsTemplateDraft } from './SmsSampleEditor'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import type { SmsTemplate } from '../../types'
import { FormField, Select } from '../form'
import { smsActionsRowClass, smsCardClass, smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import type { WalletAccountWithRow } from '../wallet/types'
import { resolveAccountKind } from '../wallet/walletCardUtils'

type BankSmsUnknownCardProps = {
  entry: ReviewedSms
  accounts: WalletAccountWithRow[]
  templates: SmsTemplate[]
  savingTemplate: boolean
  busy: boolean
  onCreateTemplate: (accountId: string, draft: SmsTemplateDraft) => Promise<boolean>
  onDismiss: () => void
}

/** Looks like a bank SMS but fits no template: teach the app, or ignore it. */
export default function BankSmsUnknownCard({
  entry,
  accounts,
  templates,
  savingTemplate,
  busy,
  onCreateTemplate,
  onDismiss
}: BankSmsUnknownCardProps) {
  const [teaching, setTeaching] = useState(false)
  const [accountId, setAccountId] = useState('')
  const options = accounts.filter(account => resolveAccountKind(account) !== 'cash')

  return (
    <Card className={smsCardClass}>
      <BankSmsCardHead entry={entry} accountTitle="پیامک ناشناخته" />
      <p className={smsHintClass}>
        این پیامک شبیه پیامک بانکی است ولی با هیچ قالبی جور نشد. اگر قالب بانک عوض شده یا حسابش هنوز
        قالب ندارد، از همین پیامک قالب بسازید.
      </p>

      {teaching ? (
        <>
          <FormField label="این پیامک مال کدام حساب است؟" required controlWidth="full">
            <Select
              value={accountId}
              onChange={setAccountId}
              aria-label="حساب این پیامک"
              options={[
                { value: '', label: 'انتخاب حساب', disabled: true },
                ...options.map(account => ({ value: account.id, label: account.title }))
              ]}
            />
          </FormField>
          {accountId && (
            <SmsSampleEditor
              learned={templates}
              initialText={entry.sms.body}
              saving={savingTemplate}
              onSave={async draft => {
                if (await onCreateTemplate(accountId, draft)) setTeaching(false)
              }}
              onCancel={() => setTeaching(false)}
            />
          )}
        </>
      ) : (
        <div className={smsActionsRowClass}>
          <Button type="button" size="sm" disabled={busy} onClick={() => setTeaching(true)}>
            ساخت قالب
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onDismiss}>
            نادیده
          </Button>
        </div>
      )}
    </Card>
  )
}
