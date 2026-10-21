import { BUILDING_ROLES, CHARGE_METHODS, VACANCY_RULES, optionLabel } from './buildingOptions'
import type { BuildingMember } from '../../services/buildingRoles'
import { OPENING_REFERENCE_PREFIX, occupancyCounts } from '../../services/buildingSetupActions'
import type { BuildingProfile } from '../../services/buildingTemplate'
import type { UnitWithRow } from '../../services/buildingUnits'
import type { Receivable, WalletAccount } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { JALALI_MONTHS } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'

export interface SummaryRow {
  label: string
  value: string
}

export interface SummarySection {
  title: string
  rows: SummaryRow[]
}

const fa = (value: number) => toPersianDigits(String(value))

/** «1405-07» → «مهر ۱۴۰۵». */
export function monthTitle(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)

  return `${JALALI_MONTHS[(month || 1) - 1] ?? ''} ${fa(year)}`
}

/** The month keys that have charge receivables, oldest first. */
export function issuedMonths(receivables: Pick<Receivable, 'reference'>[]): string[] {
  const keys = receivables
    .map(item => /^charge:[^:]+:(\d{4}-\d{2})$/.exec(item.reference ?? '')?.[1])
    .filter((key): key is string => !!key)

  return [...new Set(keys)].sort()
}

interface SummaryInput {
  profile: BuildingProfile
  units: UnitWithRow[]
  accounts: Pick<WalletAccount, 'title' | 'balance'>[]
  receivables: Receivable[]
  members: Pick<BuildingMember, 'email' | 'role'>[]
}

/** The journey's last screen: what was set up, as sections for the sheet and text to share. */
export function buildJourneySummary(input: SummaryInput): {
  sections: SummarySection[]
  text: string
} {
  const { profile, units, accounts, receivables, members } = input
  const counts = occupancyCounts(units)

  const months = issuedMonths(receivables)

  const first = months[0]

  const firstItems = receivables.filter(item => item.reference?.endsWith(`:${first}`))

  const opening = receivables.filter(item => item.reference?.startsWith(OPENING_REFERENCE_PREFIX))

  const total = accounts.reduce((sum, account) => sum + account.balance, 0)

  const sections: SummarySection[] = [
    {
      title: 'ساختمان',
      rows: [
        { label: 'نام', value: profile.name },
        { label: 'نشانی', value: profile.address || '—' },
        { label: 'طبقه', value: fa(profile.floors) },
        {
          label: 'واحدها',
          value: `${fa(units.length)} واحد · ${fa(counts.owner)} مالک ساکن · ${fa(
            counts.tenant
          )} مستأجر · ${fa(counts.vacant)} خالی`
        }
      ]
    },
    {
      title: 'صندوق',
      rows: [
        ...accounts.map(account => ({ label: account.title, value: formatMoney(account.balance) })),
        { label: 'جمع', value: formatMoney(total) }
      ]
    },
    {
      title: 'شارژ',
      rows: [
        { label: 'شارژ پیش‌فرض', value: formatMoney(profile.defaultCharge) },
        { label: 'روش', value: optionLabel(CHARGE_METHODS, profile.chargeMethod) },
        {
          label: 'صدور و سررسید',
          value: `روز ${fa(profile.issueDay)} · روز ${fa(profile.dueDay)}`
        },
        { label: 'واحد خالی', value: optionLabel(VACANCY_RULES, profile.vacancyRule) },
        {
          label: first ? `شارژ ${monthTitle(first)}` : 'شارژ اول',
          value: first
            ? `${fa(firstItems.length)} واحد · ${formatMoney(
                firstItems.reduce((sum, item) => sum + item.amount, 0)
              )}`
            : 'صادر نشده'
        },
        {
          label: 'بدهی‌های قبلی',
          value: opening.length
            ? `${fa(opening.length)} واحد · ${formatMoney(
                opening.reduce((sum, item) => sum + item.amount, 0)
              )}`
            : '—'
        }
      ]
    },
    {
      title: 'اعضا',
      rows: members.map(member => ({
        label: member.email,
        value: optionLabel(BUILDING_ROLES, member.role)
      }))
    }
  ]

  const text = [
    `خلاصهٔ راه‌اندازی ${profile.name}`,
    ...sections.flatMap(section => [
      '',
      section.title,
      ...section.rows.map(row => `${row.label}: ${row.value}`)
    ])
  ].join('\n')

  return { sections, text }
}
