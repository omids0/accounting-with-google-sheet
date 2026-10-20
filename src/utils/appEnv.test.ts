import { afterEach, describe, expect, it, vi } from 'vitest'

import { version } from '../../package.json'

async function loadAppEnv() {
  vi.resetModules()

  return import('./appEnv')
}

describe('appEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the plain name and version in production builds', async () => {
    vi.stubEnv('VITE_APP_ENV', '')

    const env = await loadAppEnv()

    expect(env.IS_DEV_BUILD).toBe(false)
    expect(env.APP_NAME).toBe('حساب کتاب')
    expect(env.APP_VERSION_LABEL).toBe(version)
  })

  it('labels develop builds as dev in the name and the version', async () => {
    vi.stubEnv('VITE_APP_ENV', 'dev')

    const env = await loadAppEnv()

    expect(env.IS_DEV_BUILD).toBe(true)
    expect(env.APP_NAME).toBe('حساب کتاب (dev)')
    expect(env.APP_VERSION_LABEL).toBe(`${version}-dev`)
  })
})
