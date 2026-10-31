import MoneyText from '../MoneyText'

/** An amount inside running text: isolated with `<bdi>` so its digits never reorder the sentence. */
export default function ForecastMoney({
  amount,
  signed = true
}: {
  amount: number
  /** true: a minus only when negative; 'plus': a plus on positives too (money moving). */
  signed?: boolean | 'plus'
}) {
  return (
    <bdi>
      <MoneyText amount={amount} signed={signed} />
    </bdi>
  )
}
