import {
  dashboardHeroMoneyDisplayClass,
  moneyDisplayClass,
  moneyDisplaySignClass,
  moneyDisplayUnitClassName,
  moneyDisplayValueClassName
} from './ui/displayStyles'
import { cn } from '../utils/cn'
import { MINUS_SIGN, formatMoney, formatMoneyParts } from '../utils/formatMoney'

export type MoneyDisplaySize = 'hero' | 'stat' | 'stat-wide' | 'record'
export type MoneyDisplayTone =
  | 'default'
  | 'hero'
  | 'income'
  | 'expense'
  | 'positive'
  | 'negative'
  | 'primary'

export default function MoneyDisplay({
  amount,
  size = 'stat',
  tone = 'default',
  signed = false,
  className = ''
}: {
  amount: number
  size?: MoneyDisplaySize
  tone?: MoneyDisplayTone
  signed?: boolean
  className?: string
}) {
  const displayAmount = signed ? Math.abs(amount) : amount
  const { number, symbol } = formatMoneyParts(displayAmount)

  const sign = signed && amount > 0 ? '+' : signed && amount < 0 ? MINUS_SIGN : null

  return (
    <span
      className={cn(
        moneyDisplayClass({ size, tone }),
        size === 'hero' && tone === 'hero' && dashboardHeroMoneyDisplayClass,
        className
      )}
      dir="rtl"
      aria-label={formatMoney(amount)}
    >
      {/*
        Only the digits (with their sign) are left-to-right; the block itself stays
        right-to-left so the unit follows the number as Persian is read.
      */}
      <span className={moneyDisplayValueClassName} dir="ltr">
        {sign ? <span className={moneyDisplaySignClass}>{sign}</span> : null}
        {number}
      </span>
      <span className={moneyDisplayUnitClassName}>{symbol}</span>
    </span>
  )
}
