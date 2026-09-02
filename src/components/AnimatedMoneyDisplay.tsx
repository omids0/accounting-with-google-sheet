import MoneyDisplay, { type MoneyDisplaySize, type MoneyDisplayTone } from './MoneyDisplay'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

export default function AnimatedMoneyDisplay({
  amount,
  size = 'stat',
  tone = 'default',
  signed = false,
  className = '',
  animated = true
}: {
  amount: number
  size?: MoneyDisplaySize
  tone?: MoneyDisplayTone
  signed?: boolean
  className?: string
  animated?: boolean
}) {
  const displayAmount = useAnimatedNumber(amount, 650, animated)

  const value = animated ? displayAmount : amount

  return (
    <MoneyDisplay amount={value} size={size} tone={tone} signed={signed} className={className} />
  )
}
