import type { PersonInput } from '../../services/buildingSetupActions'
import { normalizeDigits } from '../../utils/normalizeDigits'
import AmountField from '../AmountField'
import { FormField, FormRow, FormSelect } from '../form'
import { OCCUPANCY, type Occupancy } from './buildingOptions'
import type { UnitForm } from './completeUnitForm'
import WalletCardNumberInput from '../wallet/WalletCardNumberInput'

interface CompleteUnitFieldsProps {
  form: UnitForm
  /** What the building's method charges this unit right now. */
  baseCharge: number
  onChange: (next: UnitForm) => void
}

/** Phone numbers and cards are plain text (leading zeros stay); only digits are normalized. */
function PersonFields({
  prefix,
  value,
  withCard,
  onChange
}: {
  prefix: string
  value: PersonInput
  withCard: boolean
  onChange: (next: PersonInput) => void
}) {
  return (
    <>
      <FormRow>
        <FormField label={prefix}>
          <input
            value={value.name}
            onChange={event => onChange({ ...value, name: event.target.value })}
            autoComplete="off"
          />
        </FormField>
        <FormField label={`تلفن ${prefix}`}>
          <input
            type="text"
            dir="ltr"
            inputMode="tel"
            value={value.phone}
            onChange={event => onChange({ ...value, phone: normalizeDigits(event.target.value) })}
            autoComplete="off"
          />
        </FormField>
      </FormRow>
      {withCard ? (
        <FormField label="کارت بانکی" hint="برای تشخیص واریزهای شارژ از روی پیامک.">
          <WalletCardNumberInput
            value={value.card}
            onChange={card => onChange({ ...value, card })}
          />
        </FormField>
      ) : null}
    </>
  )
}

const numberField = (label: string, value: string, onChange: (value: string) => void) => (
  <FormField label={label}>
    <input
      value={value}
      inputMode="numeric"
      onChange={event => onChange(normalizeDigits(event.target.value))}
    />
  </FormField>
)

/** The fields of journey step 4 for one unit: owner, occupancy (+ tenant), numbers, charge. */
export default function CompleteUnitFields({
  form,
  baseCharge,
  onChange
}: CompleteUnitFieldsProps) {
  const set = (patch: Partial<UnitForm>) => onChange({ ...form, ...patch })

  return (
    <>
      <PersonFields prefix="مالک" value={form.owner} withCard onChange={owner => set({ owner })} />
      <FormSelect
        label="وضعیت سکونت"
        value={form.occupancy}
        onChange={value => set({ occupancy: value as Occupancy })}
        options={OCCUPANCY}
      />
      {form.occupancy === 'tenant' ? (
        <PersonFields
          prefix="مستأجر"
          value={form.tenant}
          withCard={false}
          onChange={tenant => set({ tenant })}
        />
      ) : null}
      <FormRow>
        {numberField('متراژ', form.area, area => set({ area }))}
        {numberField('نفرات', form.people, people => set({ people }))}
      </FormRow>
      <FormRow>
        {numberField('پارکینگ', form.parking, parking => set({ parking }))}
        {numberField('انباری', form.storage, storage => set({ storage }))}
      </FormRow>
      <FormField
        label="شارژ این واحد"
        hint={
          form.charge === null
            ? 'مطابق روش ساختمان؛ با تغییر مبلغ، فقط برای این واحد ثابت می‌شود.'
            : undefined
        }
      >
        <AmountField
          label="شارژ این واحد"
          value={form.charge ?? baseCharge}
          hideWords
          onChange={value =>
            set({ charge: Number(value) === baseCharge ? null : Number(value) || 0 })
          }
        />
      </FormField>
    </>
  )
}
