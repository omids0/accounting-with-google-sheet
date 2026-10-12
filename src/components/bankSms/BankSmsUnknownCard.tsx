import { useMemo, useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import BankSmsMoreSheet from './BankSmsMoreSheet'
import BankSmsTemplateSheet from './BankSmsTemplateSheet'
import type { useSmsTemplates } from './useSmsTemplates'
import { guessTemplate } from '../../services/bankSmsGuess'
import { guessSampleAccount } from '../../services/bankSmsMatch'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import { normalizeSmsText, tokenizeSms, type SmsToken } from '../../services/bankSmsText'
import { cn } from '../../utils/cn'
import { Select } from '../form'
import SwipeableRow from '../SwipeableRow'
import {
  smsActionsRowClass,
  smsAmountTokenClass,
  smsBadgeClass,
  smsHintClass,
  smsQueueCardClass,
  smsTokensClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import type { WalletAccountWithRow } from '../wallet/types'
import { resolveAccountKind } from '../wallet/walletCardUtils'

type BankSmsUnknownCardProps = {
  entry: ReviewedSms
  accounts: WalletAccountWithRow[]
  templatesApi: ReturnType<typeof useSmsTemplates>
  busy: boolean
  /** «نادیده»: the queue's undoable dismiss, or leaving a shared text. */
  onDismiss: () => void
}

/** A number that can be money (not a date, time or card number). */
const isMoney = (token: SmsToken) =>
  token.kind === 'number' &&
  token.numberKind === 'amount' &&
  token.value.replace(/\D/g, '').length >= 3

/**
 * Looks like a bank SMS but fits no template. Tapping the amount in the text builds
 * the template right here; the full editor stays behind ⋯ «ویرایش قالب».
 */
export default function BankSmsUnknownCard({
  entry,
  accounts,
  templatesApi,
  busy: cardBusy,
  onDismiss: dismiss
}: BankSmsUnknownCardProps) {
  const body = entry.sms.body
  const { templates, saving } = templatesApi
  const [picked, setPicked] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [templateText, setTemplateText] = useState<string | null>(null)
  const tokens = useMemo(() => tokenizeSms(normalizeSmsText(body)), [body])
  const bankAccounts = useMemo(
    () => accounts.filter(account => resolveAccountKind(account) !== 'cash'),
    [accounts]
  )
  const guessed = useMemo(
    () =>
      guessSampleAccount(
        guessTemplate(body, templates).parts,
        body,
        bankAccounts,
        getBankSmsPrefs().refAccounts
      ),
    [body, templates, bankAccounts]
  )
  const accountId = picked || guessed
  const busy = cardBusy || saving

  return (
    <>
      <SwipeableRow leftLabel="نادیده" onSwipeLeft={busy ? undefined : dismiss}>
        <Card className={cn(smsQueueCardClass, 'border-dashed')}>
          <BankSmsCardHead
            entry={entry}
            rawOpen={false}
            badge={<span className={smsBadgeClass}>ناشناخته</span>}
          />
          <p className={smsTokensClass} aria-label="متن پیامک">
            {tokens.map((token, index) =>
              isMoney(token) ? (
                <button
                  key={index}
                  type="button"
                  className={smsAmountTokenClass}
                  disabled={!accountId || busy}
                  onClick={() => void templatesApi.teachAmount(body, index, accountId)}
                  aria-label={`${token.value} مبلغ است — ساخت قالب`}
                >
                  {token.value}
                </button>
              ) : (
                <span key={index}>{token.value}</span>
              )
            )}
          </p>
          <p className={smsHintClass}>
            {bankAccounts.length
              ? 'مبلغ را در متن لمس کن تا قالب این بانک ساخته شود — یک بار.'
              : 'اول در کیف پول یک حساب بانکی بسازید.'}
          </p>
          {bankAccounts.length > 1 && (
            <Select
              value={accountId}
              onChange={setPicked}
              aria-label="حساب این پیامک"
              options={[
                { value: '', label: 'این پیامک مال کدام حساب است؟', disabled: true },
                ...bankAccounts.map(account => ({ value: account.id, label: account.title }))
              ]}
            />
          )}
          <div className={smsActionsRowClass}>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={dismiss}>
              نادیده
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setMenuOpen(true)}
              aria-label="گزینه‌های بیشتر"
            >
              ⋯
            </Button>
          </div>
        </Card>
      </SwipeableRow>

      <BankSmsMoreSheet
        open={menuOpen}
        title="پیامک ناشناخته"
        onClose={() => setMenuOpen(false)}
        actions={[
          { id: 'template', label: 'ویرایش قالب', onSelect: () => setTemplateText(body) },
          { id: 'dismiss', label: 'نادیده', onSelect: dismiss }
        ]}
      />

      <BankSmsTemplateSheet
        text={templateText}
        accountId={accountId}
        accounts={accounts}
        templatesApi={templatesApi}
        onClose={() => setTemplateText(null)}
      />
    </>
  )
}
