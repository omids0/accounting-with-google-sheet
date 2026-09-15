import type { VehicleProfile } from '../../types/vehicles'
import FormField from '../form/FormField'
import Select from '../form/Select'
import { VEHICLE_OTHER_OPTION } from '../vehicles/constants'

type VehicleSelectProps = {
  value: string
  onChange: (value: string) => void
  vehicles: VehicleProfile[]
  invalid?: boolean
  disabled?: boolean
}

export default function VehicleSelect({
  value,
  onChange,
  vehicles,
  invalid = false,
  disabled = false
}: VehicleSelectProps) {
  const options = [
    ...vehicles.map(vehicle => ({
      value: vehicle.id,
      label: vehicle.title
    })),
    { value: VEHICLE_OTHER_OPTION, label: VEHICLE_OTHER_OPTION }
  ]

  return (
    <FormField label="خودرو" required controlWidth="full">
      <Select
        value={value}
        onChange={onChange}
        options={options}
        invalid={invalid}
        disabled={disabled}
        aria-label="انتخاب خودرو"
      />
    </FormField>
  )
}
