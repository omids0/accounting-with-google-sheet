import { optionLabel, VACANCY_RULES } from './buildingOptions'
import type { BuildingProfile } from '../../services/buildingTemplate'
import { formatMoney } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'

const fa = (value: number) => toPersianDigits(String(value))

type ChargeFields = Pick<
  BuildingProfile,
  'defaultCharge' | 'chargeMethod' | 'issueDay' | 'dueDay' | 'vacancyRule'
>

/**
 * The one-line charge summary of the building settings: «شارژ ماهانه ۲٬۰۰۰٬۰۰۰ تومان برای هر
 * واحد · صدور روز ۱ · سررسید روز ۱۰». The method and the vacancy rule are named only when they
 * are not the plain defaults (a fixed amount, a full charge).
 */
export function chargeSummary(profile: ChargeFields): string {
  const parts = [`شارژ ماهانه ${formatMoney(profile.defaultCharge)} برای هر واحد`]

  if (profile.chargeMethod === 'area') parts.push('بر اساس متراژ')
  if (profile.chargeMethod === 'people') parts.push('بر اساس تعداد نفرات')
  parts.push(`صدور روز ${fa(profile.issueDay)}`, `سررسید روز ${fa(profile.dueDay)}`)
  if (profile.vacancyRule !== 'full')
    parts.push(`واحد خالی: ${optionLabel(VACANCY_RULES, profile.vacancyRule)}`)

  return parts.join(' · ')
}
