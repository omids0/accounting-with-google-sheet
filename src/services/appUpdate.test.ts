import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()

vi.mock('@capacitor/app', () => ({ App: { getInfo: async () => ({ build: '10' }) } }))
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { get } }))
vi.mock('./googleAuthNative', () => ({ isNativePlatform: () => true }))

const manifest = (versionCode: number) => ({
  status: 200,
  data: { versionCode, versionName: `v${versionCode}`, apkUrl: 'https://example.test/app.apk' }
})

async function loadFor(env: '' | 'dev', downloadUrl = '') {
  vi.resetModules()
  vi.stubEnv('VITE_APP_ENV', env)
  vi.stubEnv('VITE_APP_DOWNLOAD_URL', downloadUrl)

  return import('./appUpdate')
}

describe('update channel', () => {
  beforeEach(() => get.mockReset())
  afterEach(() => vi.unstubAllEnvs())

  it('production reads the latest release', async () => {
    get.mockResolvedValue(manifest(11))

    const { checkForUpdate, APK_DOWNLOAD_URL } = await loadFor('')

    expect(await checkForUpdate()).toMatchObject({ key: '11', versionName: 'v11' })
    expect(get.mock.calls[0][0].url).toContain('/releases/latest/download/version.json')
    expect(APK_DOWNLOAD_URL).toContain('/releases/latest/download/hesab-ketab.apk')
  })

  it('the develop APK reads its own rolling pre-release, never the latest one', async () => {
    get.mockResolvedValue(manifest(11))

    const { checkForUpdate, APK_DOWNLOAD_URL } = await loadFor('dev')

    expect(await checkForUpdate()).toMatchObject({ key: '11' })
    expect(get.mock.calls[0][0].url).toContain('/releases/download/dev-latest/version.json')
    expect(get.mock.calls[0][0].url).not.toContain('/latest/download/')
    expect(APK_DOWNLOAD_URL).toContain('/releases/download/dev-latest/hesab-ketab-dev.apk')
  })

  it('takes the download link from VITE_APP_DOWNLOAD_URL when the build sets it', async () => {
    const { APK_DOWNLOAD_URL } = await loadFor('', ' https://example.test/my.apk ')

    expect(APK_DOWNLOAD_URL).toBe('https://example.test/my.apk')
  })

  it('offers nothing when the installed build is the newest one', async () => {
    get.mockResolvedValue(manifest(10))

    const { checkForUpdate } = await loadFor('dev')

    expect(await checkForUpdate()).toBeNull()
  })

  it('offers nothing when the manifest is missing', async () => {
    get.mockResolvedValue({ status: 404, data: '' })

    const { checkForUpdate } = await loadFor('dev')

    expect(await checkForUpdate()).toBeNull()
  })
})
