import { useState } from 'react'

import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import ConfirmActionModal from '../ConfirmActionModal'
import {
  smsBulkBarBuildingClass,
  smsBulkBarClass,
  smsBulkBarSpacerClass,
  smsHintClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

type BankSmsBulkBarProps = {
  count: number
  busy: boolean
  onConfirmAll: () => void
  /** Building queue: how many of `count` are unit payments matched by the payer's card. */
  unitCount?: number
  /** A building workspace has no bottom nav, so the bar sits lower. */
  inBuilding?: boolean
}

/**
 * Bottom bar «ثبت همه شناخته‌شده‌ها (N)»: every recognised SMS that has a suggested
 * category is saved with it; «تکراری؟», «کدام حساب؟» and cards without a category stay.
 */
export default function BankSmsBulkBar({
  count,
  busy,
  onConfirmAll,
  unitCount = 0,
  inBuilding = false
}: BankSmsBulkBarProps) {
  const [asking, setAsking] = useState(false)

  if (count < 2) return null

  const countLabel = formatPersianNumber(count)

  return (
    <>
      <div className={smsBulkBarSpacerClass} aria-hidden />
      <Card className={cn(smsBulkBarClass, inBuilding && smsBulkBarBuildingClass)}>
        <p className={smsHintClass}>
          {countLabel} پیامک شناخته‌شده
          {unitCount
            ? ` · ${formatPersianNumber(unitCount)} پرداخت شارژ با کارت ساکن`
            : ' با دسته پیشنهادی'}
        </p>
        <Button type="button" size="sm" loading={busy} onClick={() => setAsking(true)}>
          ثبت همه شناخته‌شده‌ها ({countLabel})
        </Button>
        <ConfirmActionModal
          open={asking}
          title="ثبت همه شناخته‌شده‌ها"
          message={`${countLabel} تراکنش هرکدام با دسته پیشنهادی همان کارت در درآمد/هزینه ثبت و موجودی حساب‌ها به‌روز می‌شود.${
            unitCount
              ? ' پرداخت شارژ فقط برای واریزهایی است که کارت پرداخت‌کننده با کارت ساکن می‌خواند.'
              : ''
          } کارت‌های «تکراری؟»، بدون دسته و با دستهٔ «بدهی»، «طلب» یا «خودرو» می‌مانند تا جدا ثبت شوند. ادامه می‌دهید؟`}
          confirmLabel="ثبت همه"
          confirming={busy}
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            onConfirmAll()
          }}
        />
      </Card>
    </>
  )
}
