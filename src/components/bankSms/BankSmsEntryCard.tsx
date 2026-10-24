import { lazy, Suspense, useMemo, useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import BankSmsChoiceRow from './BankSmsChoiceRow'
import BankSmsMoreSheet from './BankSmsMoreSheet'
import BankSmsTemplateSheet from './BankSmsTemplateSheet'
import BankSmsUnitLine from './BankSmsUnitLine'
import { smsDuplicateLabel } from './smsLabels'
import { smsRecordType, type BankSmsReview } from './useBankSmsReview'
import { useBankSmsVehicleCard } from './useBankSmsVehicleCard'
import {
  initialSmsAccount,
  resolveSmsAccount,
  type BankSmsReviewItem
} from '../../services/bankSmsQueue'
import { toPersianDigits } from '../../utils/normalizeDigits'
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

/** The fallback payment sheet (a probable duplicate); building queues only. */
const UnitPaymentSheet = lazy(() => import('../buildings/UnitPaymentSheet'))

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

  // A deposit into a building's fund: which unit paid (round 11, Step 6).
  const offer = resolved ? review.offerFor(resolved) : null
  const [pickedUnit, setPickedUnit] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const unit =
    offer?.kind === 'card'
      ? offer.candidate.unit
      : offer?.candidates.find(item => item.unit.id === pickedUnit)?.unit ?? null

  const vehicleCard = useBankSmsVehicleCard({
    entry: resolved,
    choice,
    type,
    skip: !!offer || probableDuplicate,
    review
  })

  const primary = () => {
    if (!resolved) return
    if (vehicleCard.active) return vehicleCard.save()
    if (!offer) return review.primary(resolved, probableDuplicate)
    if (!unit) return

    // A probable duplicate goes through the payment sheet, which offers to link the record.
    return probableDuplicate ? setPayOpen(true) : void review.payUnit(resolved, unit)
  }
  const canAct = !!resolved && (!offer || !!unit) && vehicleCard.ready
  // The wireframe's buttons: a card match keeps «فقط موجودی» (other income is in ⋯), a pick shows
  // «درآمد دیگر» (the balance-only action is in ⋯).
  const pickOffer = offer?.kind === 'pick'
  const otherIncome = () =>
    resolved && review.openEntry(resolved, { choice: review.plainChoiceFor(resolved) })
  const balanceOnly = () => resolved && void review.balanceOnly(resolved)
  const actionLabel = offer
    ? unit
      ? `ثبت پرداخت واحد ${toPersianDigits(unit.number)}`
      : 'ثبت پرداخت'
    : ACTION_LABEL[type]

  return (
    <>
      <SwipeableRow
        rightLabel={`✓ ${actionLabel}`}
        rightTone={type}
        leftLabel="نادیده"
        onSwipeRight={canAct && !busy ? primary : undefined}
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

          {offer && (
            <BankSmsUnitLine
              offer={offer}
              pickedId={pickedUnit}
              onPick={setPickedUnit}
              disabled={busy}
            />
          )}

          {resolved && !offer && (
            <BankSmsChoiceRow
              type={type}
              choice={choice}
              defaultTitle={`${titleOf(accountId)} — پیامک`}
              busy={busy}
              onPick={next => review.pick(entry.sms.id, next)}
              amount={resolved.amount}
              vehicle={vehicleCard.active ? vehicleCard.vehicle : undefined}
              rootRef={vehicleCard.rootRef}
            />
          )}

          <div className={smsActionsRowClass}>
            <Button
              type="button"
              size="sm"
              variant={type === 'expense' ? 'outflow' : 'inflow'}
              disabled={!canAct || busy}
              loading={busy}
              onClick={primary}
            >
              <AppIcon name="check" size={16} />
              {actionLabel}
            </Button>
            {pickOffer && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={otherIncome}
              >
                درآمد دیگر
              </Button>
            )}
            {resolved && !duplicateMovedBalance && !pickOffer && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={balanceOnly}
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

      {payOpen && unit && review.building && resolved && (
        <Suspense fallback={null}>
          <UnitPaymentSheet
            open
            unitId={unit.id}
            data={review.building}
            initialAmount={resolved.amount}
            onClose={() => setPayOpen(false)}
            onSaved={() => {
              setPayOpen(false)
              void review.alreadyRecorded(key, [entry.sms.id])
            }}
          />
        </Suspense>
      )}

      <BankSmsMoreSheet
        open={menuOpen}
        title="پیامک بانکی"
        onClose={() => setMenuOpen(false)}
        actions={[
          ...(offer?.kind === 'card'
            ? [{ id: 'income', label: 'درآمد دیگر', onSelect: otherIncome }]
            : []),
          ...(pickOffer && !duplicateMovedBalance
            ? [{ id: 'balance', label: 'فقط موجودی', onSelect: balanceOnly }]
            : []),
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
