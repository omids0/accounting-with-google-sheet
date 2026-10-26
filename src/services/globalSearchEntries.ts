import { checkListTitle, checkTypeLabel } from './checkDirection'
import { joinParts, searchText, type SearchEntry } from './globalSearch'
import { buildingSearchEntries, type BuildingSearchSources } from './globalSearchBuilding'
import { monthLabelOf, recordEntries } from './globalSearchRecords'
import { withWriterNames } from './globalSearchWriter'
import { getAssetClassLabel } from './treasuryCatalog'
import { formatQuantityValue } from './treasuryQuantity'
import type {
  Check,
  Counterparty,
  Dang,
  InstallmentPlan,
  PersonalReminder,
  Receivable,
  SavingsGoal,
  VaultHolding,
  VehicleProfile
} from '../types'
import { dangPaymentStatus, dangRemaining, type DangPaymentStatus } from '../utils/dangLedger'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

export interface SearchRecordInput {
  id: string
  type: 'income' | 'expense'
  values: Record<string, string>
  /** The form's date field id. */
  dateField: string
  writer?: string
}

/** Everything the global search reads, straight from the local mirror. */
export interface SearchSources {
  records: SearchRecordInput[]
  accounts: { id: string; title: string }[]
  checks: Check[]
  dangs: Dang[]
  receivables: Receivable[]
  installments: InstallmentPlan[]
  counterparties: Counterparty[]
  holdings: VaultHolding[]
  goals: SavingsGoal[]
  reminders: PersonalReminder[]
  vehicles: VehicleProfile[]
  /** A building workspace only: its units and their stays (residents). */
  building?: Pick<BuildingSearchSources, 'units' | 'stays'>
  /** Display name of a «ثبت‌کننده» email; only set on a shared spreadsheet. */
  writerName?: (email: string) => string
}

function dated(prefix: string, iso: string): string {
  return iso ? `${prefix} ${formatIsoDatePersian(iso)}` : ''
}

function counterpartyEntries(sources: SearchSources): SearchEntry[] {
  const countBy = (names: string[]) => {
    const counts = new Map<string, number>()

    for (const name of names) {
      const key = searchText(name)

      if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return counts
  }
  const checks = countBy(sources.checks.map(item => item.counterparty))
  const receivables = countBy(sources.receivables.map(item => item.debtor))
  const dangs = countBy(sources.dangs.map(item => item.counterparty))

  return sources.counterparties.map(person => {
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim()
    const key = searchText(name)
    const phone = person.phones[0]?.number ?? ''
    const count = (map: Map<string, number>, label: string) => {
      const n = map.get(key) ?? 0

      return n ? `${n.toLocaleString('fa-IR')} ${label}` : ''
    }

    return {
      group: 'counterparties' as const,
      id: person.id,
      title: name || '—',
      subtitle: joinParts(
        count(checks, 'چک'),
        count(receivables, 'طلب'),
        count(dangs, 'بدهی'),
        toPersianDigits(phone)
      ),
      amount: null,
      date: '',
      text: searchText(
        name,
        person.note,
        person.address,
        ...person.phones.map(item => item.number),
        ...person.accounts.flatMap(item => [item.bankName, item.accountNumber])
      ),
      amounts: []
    }
  })
}

/** Only a partly paid or settled debt needs a mark; an untouched one reads as before. */
const DANG_STATUS_LABEL: Record<DangPaymentStatus, string> = {
  unpaid: '',
  partial: 'پرداخت جزئی',
  settled: 'پرداخت‌شده'
}

function moduleEntries(sources: SearchSources): SearchEntry[] {
  const checks = sources.checks.map(item => ({
    group: 'checks' as const,
    id: item.id,
    title: joinParts(checkListTitle(item), item.counterparty),
    subtitle: joinParts(dated('سررسید', item.dueDate), item.paid ? 'پاس‌شده' : ''),
    amount: item.amount,
    date: item.dueDate,
    text: searchText(checkTypeLabel(item), item.checkNumber, item.counterparty, item.subCategory),
    amounts: [item.amount],
    writer: item.writer
  }))
  const dangs = sources.dangs.map(item => ({
    group: 'dang' as const,
    id: item.id,
    title: item.title || item.counterparty || '—',
    subtitle: joinParts(
      item.counterparty,
      item.category,
      DANG_STATUS_LABEL[dangPaymentStatus(item)]
    ),
    amount: item.amount,
    date: item.date,
    text: searchText(item.title, item.counterparty, item.category, item.subCategory, item.note),
    // The total, what is left and every payment, so any of those numbers finds the debt.
    amounts: [item.amount, dangRemaining(item), ...item.payments.map(payment => payment.amount)],
    writer: item.writer
  }))
  const receivables = sources.receivables.map(item => ({
    group: 'receivables' as const,
    id: item.id,
    title: item.title || item.debtor || '—',
    subtitle: joinParts(item.debtor, dated('', item.borrowDate).trim()),
    amount: item.amount,
    date: item.borrowDate,
    text: searchText(item.title, item.debtor, item.category, item.subCategory, item.note),
    amounts: [item.amount, ...item.payments.map(payment => payment.amount)],
    writer: item.writer
  }))
  const installments = sources.installments.map(item => ({
    group: 'installments' as const,
    id: item.id,
    title: item.title || '—',
    subtitle: joinParts(`${item.count.toLocaleString('fa-IR')} قسط`, item.subCategory ?? ''),
    amount: item.amount,
    date: '',
    text: searchText(item.title, item.subCategory, item.note),
    amounts: [item.amount, ...item.payments.map(payment => payment.amount ?? 0)],
    writer: item.writer
  }))

  return [...checks, ...receivables, ...dangs, ...installments]
}

function otherEntries(sources: SearchSources): SearchEntry[] {
  const holdings = sources.holdings.map(({ asset, assetType, netQuantity }) => {
    const quantity = `${formatQuantityValue(netQuantity, asset.decimals)} ${asset.unit}`.trim()
    const assetClass = getAssetClassLabel(asset.assetClass)

    return {
      group: 'treasury' as const,
      id: assetType,
      title: asset.name,
      subtitle: joinParts(quantity, assetClass),
      amount: null,
      date: '',
      text: searchText(asset.name, asset.symbol, assetClass, 'صندوقچه'),
      amounts: []
    }
  })
  const goals = sources.goals.map(goal => ({
    group: 'treasury' as const,
    id: goal.id,
    title: goal.title,
    subtitle: joinParts('هدف پس‌انداز', dated('تا', goal.targetDate)),
    amount: goal.target,
    date: '',
    text: searchText(goal.title, goal.note, 'هدف'),
    amounts: [goal.target]
  }))
  const reminders = sources.reminders.map(item => ({
    group: 'reminders' as const,
    id: item.id,
    title: item.title || item.category || 'یادآوری',
    subtitle: joinParts(item.category, dated('موعد', item.dueDate)),
    amount: item.amount || null,
    date: item.dueDate.slice(0, 10),
    text: searchText(item.title, item.category),
    amounts: item.amount ? [item.amount] : []
  }))
  const vehicles = sources.vehicles.map(item => ({
    group: 'vehicles' as const,
    id: item.id,
    title: item.title || '—',
    subtitle: joinParts(toPersianDigits(item.plate), toPersianDigits(item.buildYear)),
    amount: null,
    date: '',
    text: searchText(item.title, item.plate, item.vin, item.buildYear),
    amounts: []
  }))

  return [...holdings, ...goals, ...reminders, ...vehicles]
}

/** Every searchable item of every module, normalized once per data load. */
export function buildSearchEntries(sources: SearchSources): SearchEntry[] {
  return withWriterNames(
    [
      ...counterpartyEntries(sources),
      ...recordEntries(sources),
      ...moduleEntries(sources),
      ...otherEntries(sources),
      ...(sources.building
        ? buildingSearchEntries({ ...sources.building, counterparties: sources.counterparties })
        : [])
    ],
    sources.writerName
  )
}

/** Distinct months of the records, newest first — the empty-input suggestions. */
export function recentMonthLabels(entries: SearchEntry[], count = 3): string[] {
  const labels: string[] = []

  for (const entry of entries) {
    if (entry.group !== 'records' || !entry.date) continue

    const label = monthLabelOf(entry.date)

    if (label && !labels.includes(label)) labels.push(label)
    if (labels.length >= count) break
  }

  return labels
}
