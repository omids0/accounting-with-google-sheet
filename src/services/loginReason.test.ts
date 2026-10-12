import { describe, expect, it } from 'vitest'

import { resolveLoginReason } from './loginReason'

const RETURNING = { hasStoredSession: true, hasSpreadsheet: true, needsScopeUpgrade: false }

describe('resolveLoginReason', () => {
  it('reports an expired session for a returning user', () => {
    expect(resolveLoginReason(RETURNING)).toBe('expired')
  })

  it('shows the plain login on a first visit or after sign-out', () => {
    expect(resolveLoginReason({ ...RETURNING, hasStoredSession: false })).toBeUndefined()
  })

  it('shows the plain login when no spreadsheet was ever set up', () => {
    expect(resolveLoginReason({ ...RETURNING, hasSpreadsheet: false })).toBeUndefined()
  })

  it('leaves the scope-upgrade notice to the plain login', () => {
    expect(resolveLoginReason({ ...RETURNING, needsScopeUpgrade: true })).toBeUndefined()
  })
})
