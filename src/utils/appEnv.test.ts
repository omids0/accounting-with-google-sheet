import { afterEach, describe, expect, it, vi } from 'vitest'

import { version } from '../../package.json'

async function loadAppEnv() {
  vi.resetModules()

  return import('./appEnv')
}

/** `VITE_APP_ENV` (the develop workflows) and `DEV` (the Vite dev server) as a build sees them. */
function stub(appEnv: '' | 'dev', devServer: boolean) {
  vi.stubEnv('VITE_APP_ENV', appEnv)
  vi.stubEnv('DEV', devServer)
  vi.stubEnv('PROD', !devServer)
}

describe('appEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the plain name and version in production builds', async () => {
    stub('', false)

    const env = await loadAppEnv()

    expect(env.IS_DEV_BUILD).toBe(false)
    expect(env.IS_DEV_ENV).toBe(false)
    expect(env.APP_NAME).toBe('حساب کتاب')
    expect(env.APP_VERSION_LABEL).toBe(version)
  })

  it('labels develop builds as dev in the name and the version', async () => {
    stub('dev', false)

    const env = await loadAppEnv()

    expect(env.IS_DEV_BUILD).toBe(true)
    expect(env.IS_DEV_ENV).toBe(true)
    expect(env.APP_NAME).toBe('حساب کتاب (dev)')
    expect(env.APP_VERSION_LABEL).toBe(`${version}-dev`)
  })

  it('labels the local dev server as dev without isolating its storage', async () => {
    stub('', true)

    const env = await loadAppEnv()

    // Only the visible labels follow the dev server; storage isolation keeps following the
    // develop build, because localhost is already its own origin and must keep its session.
    expect(env.IS_DEV_BUILD).toBe(false)
    expect(env.IS_DEV_ENV).toBe(true)
    expect(env.APP_NAME).toBe('حساب کتاب (dev)')
    expect(env.APP_VERSION_LABEL).toBe(`${version}-dev`)
  })

  it('is dev in both ways at once on a develop build run by the dev server', async () => {
    stub('dev', true)

    const env = await loadAppEnv()

    expect(env.IS_DEV_BUILD).toBe(true)
    expect(env.IS_DEV_ENV).toBe(true)
    expect(env.APP_VERSION_LABEL).toBe(`${version}-dev`)
  })
})
