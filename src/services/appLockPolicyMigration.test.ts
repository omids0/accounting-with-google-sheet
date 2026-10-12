import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getIdleMinutes, getLockPolicy, setLockPolicy } from './appLockPolicy'
import { consumeLockPolicyNotice, migrateImplicitLockPolicy } from './appLockPolicyMigration'
import { getDeviceConfig, saveDeviceConfig } from './appLockStorage'

const lockState = vi.hoisted(() => ({ enabled: true }))

vi.mock('./appLock', () => ({ isAppLockEnabled: () => lockState.enabled }))

vi.mock('./settings', () => ({ getSettings: () => ({ spreadsheetId: 'sheet-1' }) }))

describe('lock policy default migration', () => {
  beforeEach(() => {
    localStorage.clear()
    lockState.enabled = true
  })

  it('moves a lock with no stored policy to idle/5 and queues one toast', () => {
    saveDeviceConfig({ biometricEnabled: true })

    migrateImplicitLockPolicy()

    expect(getLockPolicy()).toBe('idle')
    expect(getIdleMinutes()).toBe(5)
    expect(getDeviceConfig()?.biometricEnabled).toBe(true)
    expect(consumeLockPolicyNotice()).toBe(true)
    expect(consumeLockPolicyNotice()).toBe(false)
  })

  it('moves a stored background policy that was never marked as chosen', () => {
    saveDeviceConfig({ lockPolicy: 'background', idleMinutes: 30 })

    migrateImplicitLockPolicy()

    expect(getLockPolicy()).toBe('idle')
    expect(getIdleMinutes()).toBe(5)
  })

  it('runs only once', () => {
    migrateImplicitLockPolicy()
    consumeLockPolicyNotice()
    migrateImplicitLockPolicy()

    expect(consumeLockPolicyNotice()).toBe(false)
  })

  it('keeps a policy the user picked', () => {
    setLockPolicy('background', 5, true)

    migrateImplicitLockPolicy()

    expect(getLockPolicy()).toBe('background')
    expect(consumeLockPolicyNotice()).toBe(false)
  })

  it('keeps a non-default policy even without the flag', () => {
    saveDeviceConfig({ lockPolicy: 'always' })

    migrateImplicitLockPolicy()

    expect(getLockPolicy()).toBe('always')
    expect(consumeLockPolicyNotice()).toBe(false)
  })

  it('does not mark a policy as chosen when only the idle minutes change', () => {
    saveDeviceConfig({ lockPolicy: 'background' })
    setLockPolicy('background', 15)

    migrateImplicitLockPolicy()

    expect(getLockPolicy()).toBe('idle')
  })

  it('does nothing while the lock is off', () => {
    lockState.enabled = false

    migrateImplicitLockPolicy()

    expect(getDeviceConfig()).toBeNull()
  })
})
