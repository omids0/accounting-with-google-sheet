import AmountInput from '../AmountInput'

type MileageInputProps = {
  value: string | number
  onChange: (value: number | '') => void
  invalid?: boolean
}

export default function MileageInput({ value, onChange, invalid }: MileageInputProps) {
  return <AmountInput value={value} onChange={onChange} unit="km" hideWords invalid={invalid} />
}
