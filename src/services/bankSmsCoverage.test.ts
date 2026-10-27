import { beforeEach, describe, expect, it, vi } from 'vitest'

import { coverSmsPart, COVERAGE_KEEP_MS, smsCoverage } from './bankSmsCoverage'
import { BANK_SMS_PREFS_KEY, getBankSmsPrefs } from './bankSmsPrefs'

const dismissSms = vi.hoisted(() => vi.fn())

vi.mock('./bankSmsApply', () => ({ dismissSms }))

beforeEach(() => {
  localStorage.removeItem(BANK_SMS_PREFS_KEY)
  dismissSms.mockReset()
  dismissSms.mockResolvedValue(undefined)
})

describe('smsCoverage', () => {
  it('adds up the SMS closed as a part of one record', async () => {
    await coverSmsPart('s1', 'r1', 10_000_000)
    await coverSmsPart('s2', 'r1', 10_000_000)
    await coverSmsPart('s3', 'r2', 5)

    expect(smsCoverage().get('r1')).toBe(20_000_000)
    expect(smsCoverage().get('r2')).toBe(5)
    expect(smsCoverage().get('gone')).toBeUndefined()
    expect(dismissSms).toHaveBeenCalledWith(['s1'])
  })

  it('takes the memory back when the close fails', async () => {
    await coverSmsPart('s1', 'r1', 10)
    dismissSms.mockRejectedValueOnce(new Error('native'))

    await expect(coverSmsPart('s2', 'r1', 10)).rejects.toThrow('native')
    expect(smsCoverage().get('r1')).toBe(10)
  })

  it('ignores an entry older than the keep window even before another close prunes it', async () => {
    await coverSmsPart('old', 'r1', 10, 1_000)

    expect(smsCoverage(1_000 + COVERAGE_KEEP_MS - 1).get('r1')).toBe(10)
    expect(smsCoverage(1_000 + COVERAGE_KEEP_MS).get('r1')).toBeUndefined()
  })

  it('drops entries older than the keep window when a new one is written', async () => {
    await coverSmsPart('old', 'r1', 10, 1_000)
    await coverSmsPart('new', 'r2', 10, 1_000 + COVERAGE_KEEP_MS + 1)

    expect(Object.keys(getBankSmsPrefs().smsCoverage)).toEqual(['new'])
  })
})

describe('closeAsRecorded (NEW2)', () => {
  const leg = (id: string, amount = 10_000_000) => ({ sms: { id }, amount })
  const pair = (debit: unknown, credit: unknown) =>
    ({
      kind: 'transfer',
      debit: leg('d'),
      credit: leg('c'),
      duplicateLegs: { debit, credit }
    } as never)

  it('a transfer pair remembers each recorded leg as covering its record and closes both SMS', async () => {
    const { closeAsRecorded } = await import('./bankSmsCoverage')

    await closeAsRecorded(pair({ id: 'r1' }, { id: 'i1' }))
    expect(smsCoverage().get('r1')).toBe(10_000_000)
    expect(smsCoverage().get('i1')).toBe(10_000_000)
    expect(dismissSms).toHaveBeenCalledTimes(2)
  })

  it('a leg without a record is only dismissed', async () => {
    const { closeAsRecorded } = await import('./bankSmsCoverage')

    await closeAsRecorded(pair({ id: 'r1' }, null))
    expect(smsCoverage().size).toBe(1)
    expect(dismissSms).toHaveBeenCalledWith(['c'])
  })

  it('a single SMS covers its matched record in full, or is just dismissed without one', async () => {
    const { closeAsRecorded } = await import('./bankSmsCoverage')

    await closeAsRecorded({
      kind: 'single',
      entry: { sms: { id: 's1' }, amount: 20 },
      duplicateOf: { id: 'r9' }
    } as never)
    expect(smsCoverage().get('r9')).toBe(20)
    await closeAsRecorded({
      kind: 'single',
      entry: { sms: { id: 's2' }, amount: 5 },
      duplicateOf: null
    } as never)
    expect(dismissSms).toHaveBeenLastCalledWith(['s2'])
  })
})
