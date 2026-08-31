import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import MoneyDisplay, {
  type MoneyDisplaySize,
  type MoneyDisplayTone,
} from './MoneyDisplay';

export default function AnimatedMoneyDisplay({
  amount,
  size = 'stat',
  tone = 'default',
  signed = false,
  className = '',
  animated = true,
}: {
  amount: number;
  size?: MoneyDisplaySize;
  tone?: MoneyDisplayTone;
  signed?: boolean;
  className?: string;
  animated?: boolean;
}) {
  const displayAmount = useAnimatedNumber(amount);
  const value = animated ? displayAmount : amount;

  return (
    <MoneyDisplay
      amount={value}
      size={size}
      tone={tone}
      signed={signed}
      className={className}
    />
  );
}
