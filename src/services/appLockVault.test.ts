import { describe, expect, it } from 'vitest'

import {
  VAULT_PBKDF2_ITERATIONS,
  decryptJson,
  encryptJson,
  generateDataKey,
  unwrapDataKey,
  wrapDataKey
} from './appLockVault'

/** Real vaults use 600k rounds; tests use fewer so the suite stays fast. */
const TEST_ITERATIONS = 1_000

async function rawKey(key: CryptoKey): Promise<string> {
  return Buffer.from(await crypto.subtle.exportKey('raw', key)).toString('hex')
}

describe('app lock vault', () => {
  it('uses at least 600k PBKDF2 rounds and a 16-byte salt by default', async () => {
    expect(VAULT_PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000)

    const vault = await wrapDataKey(await generateDataKey(), '123456', TEST_ITERATIONS)

    expect(Buffer.from(vault.salt, 'base64')).toHaveLength(16)
    expect(Buffer.from(vault.iv, 'base64')).toHaveLength(12)
  })

  it('unwraps the same data key with the right PIN', async () => {
    const dek = await generateDataKey()

    const vault = await wrapDataKey(dek, '123456', TEST_ITERATIONS)

    const unwrapped = await unwrapDataKey(vault, '123456')

    expect(unwrapped).not.toBeNull()
    expect(await rawKey(unwrapped!)).toBe(await rawKey(dek))
  })

  it('rejects a wrong PIN', async () => {
    const vault = await wrapDataKey(await generateDataKey(), '123456', TEST_ITERATIONS)

    expect(await unwrapDataKey(vault, '654321')).toBeNull()
  })

  it('round-trips a snapshot with a fresh IV each time', async () => {
    const dek = await generateDataKey()

    const sheets = {
      کیف_پول: [
        ['تاریخ', 'مبلغ'],
        ['1403/01/01', '1000']
      ]
    }

    const first = await encryptJson(dek, sheets, 'sheet-1')

    const second = await encryptJson(dek, sheets, 'sheet-1')

    expect(first.iv).toHaveLength(12)
    expect(Buffer.from(first.iv).equals(Buffer.from(second.iv))).toBe(false)
    expect(await decryptJson(dek, first, 'sheet-1')).toEqual(sheets)
  })

  it('refuses a record moved to another spreadsheet or read with another key', async () => {
    const dek = await generateDataKey()

    const payload = await encryptJson(dek, { a: [['1']] }, 'sheet-1')

    await expect(decryptJson(dek, payload, 'sheet-2')).rejects.toThrow()
    await expect(decryptJson(await generateDataKey(), payload, 'sheet-1')).rejects.toThrow()
  })
})
