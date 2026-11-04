import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ exists: true as boolean | Error }))

vi.mock('./sheets', () => ({
  verifySpreadsheetExists: vi.fn(async () => {
    if (io.exists instanceof Error) throw io.exists

    return io.exists
  })
}))

import { isChildAccessLost, markOpenChildLostIfDenied, probeChildAccess } from './childAccessLost'
import { SpreadsheetNoAccessError } from './spreadsheetAccess'
import { setWorkspaceType } from './workspace'

const denied = () => new SpreadsheetNoAccessError()

beforeEach(() => {
  localStorage.clear()
  io.exists = true
})

describe('markOpenChildLostIfDenied (the sync pull failed on the open sheet)', () => {
  it('marks a child sheet whose pull was denied, so the pages show the lost screen', () => {
    setWorkspaceType('CH', 'child')

    expect(markOpenChildLostIfDenied('CH', denied())).toBe(true)
    expect(isChildAccessLost('CH')).toBe(true)
  })

  it('leaves a child sheet alone when the failure is not a denial (offline, server error)', () => {
    setWorkspaceType('CH', 'child')

    expect(markOpenChildLostIfDenied('CH', new Error('Failed to fetch'))).toBe(false)
    expect(isChildAccessLost('CH')).toBe(false)
  })

  it('never marks the parent’s own sheet, whatever the failure', () => {
    setWorkspaceType('MINE', 'personal')

    expect(markOpenChildLostIfDenied('MINE', denied())).toBe(false)
    expect(isChildAccessLost('MINE')).toBe(false)
  })
})

describe('probeChildAccess (the periodic re-probe)', () => {
  it('flags a revoked share and clears the flag once the file opens again', async () => {
    io.exists = false
    expect(await probeChildAccess('CH')).toBe('lost')
    expect(isChildAccessLost('CH')).toBe(true)

    io.exists = true
    expect(await probeChildAccess('CH')).toBe('ok')
    expect(isChildAccessLost('CH')).toBe(false)
  })

  it('keeps the flag as it was when it cannot tell', async () => {
    io.exists = new Error('Failed to fetch')

    expect(await probeChildAccess('CH')).toBe('unknown')
    expect(isChildAccessLost('CH')).toBe(false)
  })
})
