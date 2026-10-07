import { useState } from 'react'
import { useNavigate } from 'react-router'

import BankSmsBulkBar from './BankSmsBulkBar'
import BankSmsEntryCard from './BankSmsEntryCard'
import BankSmsSettingsCard from './BankSmsSettingsCard'
import BankSmsTransferCard from './BankSmsTransferCard'
import BankSmsUnknownCard from './BankSmsUnknownCard'
import { useBankSmsReview } from './useBankSmsReview'
import { getPathForTab } from '../../routes/paths'
import { buildBankSmsEntryState } from '../../services/bankSmsEntry'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { isConfigured } from '../../services/settings'
import EmptyState from '../EmptyState'
import { smsPageClass } from '../ui/bankSmsStyles'

function BankSmsReview() {
  const review = useBankSmsReview()
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(() => getBankSmsPrefs().enabled)
  const { templates, saving, add } = review.templatesApi

  return (
    <div className={smsPageClass}>
      <BankSmsSettingsCard
        onChanged={() => {
          setEnabled(getBankSmsPrefs().enabled)
          void review.refresh()
        }}
      />

      {enabled && review.items.length === 0 && (
        <EmptyState
          icon="empty-inbox"
          message={review.loading ? 'در حال خواندن پیامک‌ها…' : 'پیامک بانکی در انتظار بررسی نیست'}
        />
      )}

      {enabled && (
        <BankSmsBulkBar
          count={review.bulkCount}
          busy={review.busyKey === 'all'}
          onConfirmAll={() => void review.confirmAll()}
        />
      )}

      {enabled &&
        review.items.map(item => {
          const busy = review.busyKey === item.key

          if (item.kind === 'transfer') {
            return (
              <BankSmsTransferCard
                key={item.key}
                debit={item.debit}
                credit={item.credit}
                accounts={review.accounts}
                busy={busy}
                onConfirm={() => void review.confirmTransfer(item.key, item.debit, item.credit)}
                onSplit={() => review.splitTransfer([item.debit.sms.id, item.credit.sms.id])}
              />
            )
          }

          const { entry } = item
          const dismiss = () => void review.dismiss(item.key, [entry.sms.id])

          if (entry.result.kind === 'unknown') {
            return (
              <BankSmsUnknownCard
                key={item.key}
                entry={entry}
                accounts={review.accounts}
                templates={templates}
                savingTemplate={saving}
                busy={busy}
                onCreateTemplate={async (accountId, draft) =>
                  Boolean(await add({ ...draft, accountId }))
                }
                onDismiss={dismiss}
              />
            )
          }

          return (
            <BankSmsEntryCard
              key={item.key}
              entry={entry}
              probableDuplicate={item.probableDuplicate}
              accounts={review.accounts}
              busy={busy}
              onOpenEntry={(resolved, accountTitle) => {
                const state = buildBankSmsEntryState(resolved, accountTitle)
                const formType = state.bankSmsEntry.formType

                navigate(getPathForTab('entry', { formType }), { state })
              }}
              onBalanceOnly={resolved => void review.confirm(resolved, null)}
              onDismiss={dismiss}
              onAlreadyRecorded={() =>
                void review.dismiss(item.key, [entry.sms.id], 'از لیست خارج شد')
              }
            />
          )
        })}
    </div>
  )
}

/** «پیامک‌های بانکی»: review queue for income/expense captured from bank SMS. */
export default function BankSmsPage() {
  if (!isConfigured()) return <EmptyState icon="empty-inbox" message="ابتدا با گوگل وارد شوید" />

  if (!isBankSmsAvailable()) {
    return (
      <EmptyState
        icon="empty-inbox"
        message="ثبت از پیامک بانکی فقط در نسخه اندروید اپ کار می‌کند. قالب پیامک‌ها را می‌توانید همین‌جا در کیف پول بسازید."
      />
    )
  }

  return <BankSmsReview />
}
