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
