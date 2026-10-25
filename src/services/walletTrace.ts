import { amountHints } from './walletTraceHints'
import { accountFindings, unlinkedFindings } from './walletTraceLedger'
import { isSignificant, recordFindings } from './walletTraceRecords'
import type {
  TraceContext,
  TraceFinding,
  TraceInput,
  TraceMonth,
  TraceReport
} from './walletTraceTypes'
import { getJalaliMonthKey, listJalaliMonthKeys } from '../utils/dateRange'
import { roundMoney } from '../utils/roundMoney'

function buildContext(input: TraceInput): TraceContext {
  const ledgerByRecord: TraceContext['ledgerByRecord'] = new Map()

  for (const entry of input.ledger) {
    if (!entry.recordId) continue
    ledgerByRecord.set(entry.recordId, [...(ledgerByRecord.get(entry.recordId) ?? []), entry])
  }

  return {
    input,
    accountTitles: new Map(input.accounts.map(account => [account.id, account.title])),
    ledgerByRecord,
    recordIds: new Set(input.records.map(record => record.id ?? '').filter(Boolean))
  }
}

/**
 * A record whose history row was never written and the balance move it left without a row
 * are one event seen from both sides; together they add up to nothing.
 */
function dropFailedLogs(findings: TraceFinding[]): TraceFinding[] {
  const drop = new Set<string>()

  for (const missing of findings.filter(item => item.kind === 'no-ledger')) {
    const twin = findings.find(
      item =>
        item.kind === 'outside-ledger' &&
        !drop.has(item.id) &&
        item.accountId === missing.accountId &&
        Math.abs(item.effect + missing.effect) < 0.5
    )

    if (!twin) continue
    drop.add(missing.id)
    drop.add(twin.id)
  }

  return findings.filter(item => !drop.has(item.id))
}

function byImportance(a: TraceFinding, b: TraceFinding): number {
  if (a.group !== b.group) return a.group === 'suspect' ? -1 : 1

  return Math.abs(b.effect) - Math.abs(a.effect)
}

/** The findings of each month from the first one on; what cannot be placed goes to `undated`. */
function buildTimeline(
  findings: TraceFinding[],
  input: TraceInput
): { timeline: TraceMonth[]; undated: number } {
  const months = new Map<string, TraceMonth>(
    listJalaliMonthKeys(input.anchorMonthKey, input.currentMonthKey).map(monthKey => [
      monthKey,
      { monthKey, effect: 0, cumulative: 0, count: 0 }
    ])
  )
  let undated = 0

  for (const item of findings) {
    const month = item.date ? months.get(getJalaliMonthKey(item.date)) : undefined

    if (!month) {
      undated = roundMoney(undated + item.effect)
      continue
    }
    month.effect = roundMoney(month.effect + item.effect)
    month.count += 1
  }

  let running = 0

  for (const month of months.values()) {
    running = roundMoney(running + month.effect)
    month.cumulative = running
  }

  return { timeline: [...months.values()], undated }
}

function originMonth(findings: TraceFinding[]): string {
  const dated = findings.filter(item => item.kind !== 'plug' && item.date)

  if (!dated.length) return ''

  const pool = dated.some(item => item.group === 'suspect')
    ? dated.filter(item => item.group === 'suspect')
    : dated

  return getJalaliMonthKey(pool.map(item => item.date).sort()[0])
}

/**
 * Explains `wallet − calculated`: every record and every history row that moves one side of
 * the formula without the other becomes a finding with its share of the difference.
 */
export function traceDiscrepancy(input: TraceInput): TraceReport {
  const ctx = buildContext(input)
  const findings = dropFailedLogs([
    ...recordFindings(ctx),
    ...unlinkedFindings(ctx),
    ...accountFindings(ctx)
  ]).sort(byImportance)
  const explained = roundMoney(findings.reduce((sum, item) => sum + item.effect, 0))
  const remainder = roundMoney(input.difference - explained)
  const { timeline, undated } = buildTimeline(findings, input)

  return {
    difference: input.difference,
    findings,
    explained,
    remainder,
    timeline,
    undated,
    originMonthKey: originMonth(findings),
    impliedAnchor: isSignificant(remainder) ? roundMoney(input.anchorAmount + remainder) : null,
    hints: amountHints(
      remainder,
      input.records,
      input.anchorStart,
      input.today,
      new Set(findings.flatMap(item => (item.record ? [item.record.id] : [])))
    )
  }
}
