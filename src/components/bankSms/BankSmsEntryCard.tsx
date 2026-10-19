import { useMemo, useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import BankSmsChoiceRow from './BankSmsChoiceRow'
import BankSmsMoreSheet from './BankSmsMoreSheet'
import BankSmsTemplateSheet from './BankSmsTemplateSheet'
import { smsDuplicateLabel } from './smsLabels'
import { smsRecordType, type BankSmsReview } from './useBankSmsReview'
import {
  initialSmsAccount,
  resolveSmsAccount,
  type BankSmsReviewItem
} from '../../services/bankSmsQueue'
import AppIcon from '../AppIcon'
import SwipeableRow from '../SwipeableRow'
import ToggleChipGroup from '../ToggleChipGroup'
import Alert from '../ui/Alert'
import {
  smsActionsRowClass,
  smsBadgeClass,
  smsHintClass,
  smsQueueCardClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

type BankSmsEntryCardProps = {
  item: Extract<BankSmsReviewItem, { kind: 'single' }>
  review: BankSmsReview
}

const ACTION_LABEL = { expense: 'ثبت هزینه', income: 'ثبت درآمد' } as const

/**
 * A recognised SMS: amount, account, suggested category and one main action matching
 * its direction. Swipe right = that action, left = «نادیده» (touch only).
 */
export default function BankSmsEntryCard({ item, review }: BankSmsEntryCardProps) {
  const { entry, probableDuplicate, duplicateMovedBalance, duplicateOf, key } = item
  const { result } = entry
  const candidates = result.kind === 'ambiguous' ? result.candidates : []
  const [accountId, setAccountId] = useState(() => initialSmsAccount(entry))
  const [menuOpen, setMenuOpen] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)
  const [templateText, setTemplateText] = useState<string | null>(null)
  const resolved = useMemo(() => resolveSmsAccount(entry, accountId), [entry, accountId])
  const choice = resolved ? review.choiceFor(resolved) : null
  const type = resolved ? smsRecordType(resolved) : 'expense'
  const opposite = type === 'expense' ? 'income' : 'expense'
  const busy = review.busyKey === key
  const titleOf = (id: string) =>
    review.accounts.find(account => account.id === id)?.title ?? 'حساب'
  const dismiss = () => review.dismiss(key, [entry.sms.id])
  const primary = () => resolved && review.primary(resolved, probableDuplicate)

  return (
    <>
      <SwipeableRow
        rightLabel={`✓ ${ACTION_LABEL[type]}`}
        rightTone={type}
        leftLabel="نادیده"
        onSwipeRight={resolved && !busy ? primary : undefined}
        onSwipeLeft={busy ? undefined : dismiss}
      >
        <Card className={smsQueueCardClass}>
          <BankSmsCardHead
            entry={entry}
            accountTitle={titleOf(accountId)}
            rawOpen={rawOpen}
            badge={
              probableDuplicate && (
                <span className={smsBadgeClass}>{smsDuplicateLabel(duplicateOf?.createdAtMs)}</span>
              )
            }
          />

          {entry.amount === null && (
            <Alert variant="warning">
              واحد پول اپ ریال یا تومان نیست؛ این پیامک قابل ثبت نیست.
            </Alert>
          )}
          {duplicateMovedBalance && (
            <p className={smsHintClass}>
              رکورد مشابه موجودی همین حساب را هم تغییر داده؛ اگر همان است «⋯ ← قبلاً ثبت شده».
            </p>
          )}

          {candidates.length > 1 && (
            <>
              <ToggleChipGroup
                ariaLabel="حساب این پیامک"
                options={candidates.map(candidate => ({
                  id: candidate.accountId,
                  label: titleOf(candidate.accountId)
                }))}
                selected={{ [accountId]: true }}
                onToggle={setAccountId}
              />
              <p className={smsHintClass}>
                حساب را از روی پیامک حدس زدیم؛ اگر درست نیست عوضش کنید.
              </p>
            </>
          )}

          {resolved && (
            <BankSmsChoiceRow
              type={type}
              choice={choice}
              defaultTitle={`${titleOf(accountId)} — پیامک`}
              busy={busy}
              onPick={next => review.pick(entry.sms.id, next)}
            />
          )}

          <div className={smsActionsRowClass}>
            <Button
              type="button"
              size="sm"
              variant={type === 'expense' ? 'outflow' : 'inflow'}
              disabled={!resolved || busy}
              loading={busy}
              onClick={primary}
            >
              <AppIcon name="check" size={16} />
              {ACTION_LABEL[type]}
            </Button>
            {resolved && !duplicateMovedBalance && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void review.balanceOnly(resolved)}
              >
                فقط موجودی
              </Button>
            )}
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
        title="پیامک بانکی"
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            id: 'opposite',
            label: ACTION_LABEL[opposite],
            disabled: !resolved,
            onSelect: () => resolved && review.openEntry(resolved, { formType: opposite })
          },
          {
            id: 'recorded',
            label: 'قبلاً ثبت شده',
            onSelect: () => void review.alreadyRecorded(key, [entry.sms.id])
          },
          { id: 'dismiss', label: 'نادیده', onSelect: dismiss },
          {
            id: 'raw',
            label: rawOpen ? 'بستن متن کامل' : 'متن کامل',
            onSelect: () => setRawOpen(open => !open)
          },
          { id: 'template', label: 'ویرایش قالب', onSelect: () => setTemplateText(entry.sms.body) }
        ]}
      />

      <BankSmsTemplateSheet
        text={templateText}
        accountId={accountId}
        accounts={review.accounts}
        templatesApi={review.templatesApi}
        replaceTemplateId={resolved?.result.templateId}
        onClose={() => setTemplateText(null)}
      />
    </>
  )
}
