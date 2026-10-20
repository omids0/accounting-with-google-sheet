import type { ChargeTo } from '../../services/buildingLists'
import { toPersianDigits } from '../../utils/normalizeDigits'

/**
 * Round 11 option registry: every stored choice of the building workspace is one of these lists,
 * fed to a `Select` / `FormSelect`. The `value` keys are fixed (logic and sheets use them); the
 * labels live only here. `rule` carries what the logic reads from the choice.
 */
export interface BuildingOption<V extends string = string, R = never> {
  value: V
  label: string
  hint?: string
  rule?: R
}

export type ResidentRole = 'owner' | 'tenant'

export const RESIDENT_ROLES: BuildingOption<ResidentRole>[] = [
  { value: 'owner', label: 'مالک' },
  { value: 'tenant', label: 'مستأجر' }
]

/** What happens to a unit's open receivables when its resident changes (round 11, Step 3). */
export type DebtMode = 'keep' | 'to-owner' | 'forgive'

export const DEBT_MODES: BuildingOption<DebtMode>[] = [
  { value: 'keep', label: 'بماند' },
  { value: 'to-owner', label: 'به مالک' },
  { value: 'forgive', label: 'بخشیده شود' }
]

export type Occupancy = 'owner-resident' | 'tenant' | 'vacant'

export const OCCUPANCY: BuildingOption<Occupancy>[] = [
  { value: 'owner-resident', label: 'مالک ساکن' },
  { value: 'tenant', label: 'مستأجر' },
  { value: 'vacant', label: 'خالی' }
]

export type ChargeMethod = 'fixed' | 'area' | 'people'

export const CHARGE_METHODS: BuildingOption<ChargeMethod>[] = [
  { value: 'fixed', label: 'مبلغ ثابت', hint: 'همهٔ واحدها یک مبلغ می‌دهند' },
  { value: 'area', label: 'بر اساس متراژ', hint: 'سهم هر واحد به نسبت متراژ' },
  { value: 'people', label: 'بر اساس تعداد نفرات', hint: 'سهم هر واحد به نسبت نفرات' }
]

export type VacancyRule = 'full' | 'half' | 'zero'

/** `rule` is the part of the monthly charge a vacant unit still pays. */
export const VACANCY_RULES: BuildingOption<VacancyRule, number>[] = [
  { value: 'full', label: 'شارژ کامل', rule: 1 },
  { value: 'half', label: 'نصف شارژ', rule: 0.5 },
  { value: 'zero', label: 'بدون شارژ', rule: 0 }
]

export type SplitMode = 'equal' | 'area' | 'people' | 'manual'

export const SPLIT_MODES: BuildingOption<SplitMode>[] = [
  { value: 'equal', label: 'مساوی بین واحدها' },
  { value: 'area', label: 'به نسبت متراژ' },
  { value: 'people', label: 'به نسبت نفرات' },
  { value: 'manual', label: 'دستی' }
]

export type FundAccountType = 'bank' | 'cash'

export const ACCOUNT_TYPES: BuildingOption<FundAccountType>[] = [
  { value: 'bank', label: 'بانکی' },
  { value: 'cash', label: 'نقدی' }
]

export type BuildingRole = 'manager' | 'accountant' | 'board'

export const BUILDING_ROLES: BuildingOption<BuildingRole>[] = [
  { value: 'manager', label: 'مدیر', hint: 'همه‌چیز؛ ویرایش در گوگل‌درایو' },
  { value: 'accountant', label: 'حسابدار', hint: 'ثبت و صدور شارژ؛ ویرایش در گوگل‌درایو' },
  { value: 'board', label: 'عضو هیئت مدیره', hint: 'فقط مشاهده؛ فقط‌خواندنی در گوگل‌درایو' }
]

/** «سهم هر واحد به نام» of an expense kind (the managed list stores the key). */
export const CHARGE_TO_OPTIONS: BuildingOption<ChargeTo>[] = [
  { value: 'resident', label: 'ساکن' },
  { value: 'owner', label: 'مالک' }
]

export const DAYS_1_28: BuildingOption[] = Array.from({ length: 28 }, (_, index) => ({
  value: String(index + 1),
  label: toPersianDigits(String(index + 1))
}))

/** Label of `value` in `list`; the raw value when the list does not know it (an older sheet). */
export function optionLabel(list: readonly BuildingOption<string, unknown>[], value: string) {
  return list.find(option => option.value === value)?.label ?? value
}
