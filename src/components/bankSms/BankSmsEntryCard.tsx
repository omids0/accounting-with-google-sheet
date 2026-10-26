import { lazy, Suspense, useMemo, useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import BankSmsChoiceRow from './BankSmsChoiceRow'
import { BankSmsDuplicateBadge, BankSmsDuplicateHint, BankSmsSameButton } from './BankSmsDuplicate'
import BankSmsMoreSheet from './BankSmsMoreSheet'
import BankSmsTemplateSheet from './BankSmsTemplateSheet'
import BankSmsUnitLine from './BankSmsUnitLine'
import { useBankSmsLinkCard } from './useBankSmsLinkCard'
import { smsRecordType, type BankSmsReview } from './useBankSmsReview'
import { useBankSmsVehicleCard } from './useBankSmsVehicleCard'
import {
  initialCardAccount,
  resolveSmsAccount,
  type BankSmsReviewItem
} from '../../services/bankSmsQueue'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import SwipeableRow from '../SwipeableRow'
import ToggleChipGroup from '../ToggleChipGroup'
import Alert from '../ui/Alert'
import { smsActionsRowClass, smsHintClass, smsQueueCardClass } from '../ui/bankSmsStyles'
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
  const { entry, probableDuplicate, duplicateMovedBalance, duplicatePayment, key } = item
  const { result } = entry
  const candidates = result.kind === 'ambiguous' ? result.candidates : []
  const [accountId, setAccountId] = useState(() => initialCardAccount(entry))
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
  const [closing, setClosing] = useState(false)
  const closeAsRecorded = () => {
    setClosing(true)
    void review.closeAsRecorded(item).finally(() => setClosing(false))
  }

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

  const linkCard = useBankSmsLinkCard({
    entry: resolved,
    choice,
    type,
    skip: !!offer || probableDuplicate || vehicleCard.active,
    review
  })

  const primary = () => {
    if (!resolved) return
    if (vehicleCard.active) return vehicleCard.save()
    if (linkCard.active) return linkCard.save()
    if (!offer) return review.primary(resolved, probableDuplicate)
    if (!unit) return

    // A probable duplicate goes through the payment sheet, which offers to link the record.
    return probableDuplicate ? setPayOpen(true) : void review.payUnit(resolved, unit)
  }
  // A swipe is a quick save: a link-target category still has to be asked first.
  const swipe = () => (linkCard.active ? linkCard.quickSave() : primary())
  const canAct = !!resolved && (!offer || !!unit) && vehicleCard.ready && linkCard.ready
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
        onSwipeRight={canAct && !busy ? swipe : undefined}
        onSwipeLeft={busy ? undefined : dismiss}
      >
        <Card className={smsQueueCardClass}>
          <BankSmsCardHead
            entry={entry}
            accountTitle={
              accountId
                ? titleOf(accountId)
                : candidates.map(candidate => titleOf(candidate.accountId)).join(' یا ')
            }
            rawOpen={rawOpen}
            badge={probableDuplicate && <BankSmsDuplicateBadge item={item} />}
          />

          {entry.amount === null && (
            <Alert variant="warning">
              واحد پول اپ ریال یا تومان نیست؛ این پیامک قابل ثبت نیست.
            </Alert>
          )}
          <BankSmsDuplicateHint item={item} />

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
                {accountId
                  ? 'حساب این پیامک را خودتان انتخاب کردید؛ اگر درست نیست عوضش کنید.'
                  : 'رقم کارت این پیامک به چند حساب می‌خورد؛ اول حساب را انتخاب کنید.'}
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

          {resolved && !offer && !duplicatePayment && (
            <BankSmsChoiceRow
              type={type}
              choice={choice}
              defaultTitle={`${titleOf(accountId)} — پیامک`}
              busy={busy}
              onPick={next => review.pick(entry.sms.id, next)}
              amount={resolved.amount}
              vehicle={vehicleCard.active ? vehicleCard.vehicle : undefined}
              link={linkCard.active ? linkCard.link : undefined}
              rootRef={vehicleCard.active ? vehicleCard.rootRef : linkCard.rootRef}
            />
          )}

          <div className={smsActionsRowClass}>
            {duplicatePayment && (
              <BankSmsSameButton
                item={item}
                busy={busy}
                loading={busy && closing}
                onClick={closeAsRecorded}
              />
            )}
            <Button
              type="button"
              size="sm"
              variant={duplicatePayment ? 'secondary' : type === 'expense' ? 'outflow' : 'inflow'}
              disabled={!canAct || busy}
              loading={busy && !duplicatePayment}
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
          // The same action is the card's main button when the record is a payment.
          ...(duplicatePayment
            ? []
            : [{ id: 'recorded', label: 'قبلاً ثبت شده', onSelect: closeAsRecorded }]),
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
