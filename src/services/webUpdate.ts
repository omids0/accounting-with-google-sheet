import { registerSW } from 'virtual:pwa-register'

import type { AvailableUpdate } from './appUpdate'
import { version as APP_VERSION } from '../../package.json'

/**
 * Web/PWA updates, user controlled: a new service worker installs in the background
 * and waits; nothing reloads until the user taps «به‌روزرسانی». Same shape as the
 * APK flow in `appUpdate.ts` (`checkForUpdate`, `applyUpdate`, `status`).
 */

const CHECK_INTERVAL_MS = 60 * 60_000

/** A visible tab checks again at most this often when it comes back into view. */
const VISIBLE_RECHECK_MS = 60_000

/** How long a menu check waits for a found worker to finish installing. */
const INSTALL_WAIT_MS = 30_000

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | null = null
let waiting: AvailableUpdate | null = null
let lastCheckAt = 0

const listeners = new Set<(update: AvailableUpdate | null) => void>()

/** The store follows the waiting worker through this. */
export function subscribeWebUpdate(listener: (update: AvailableUpdate | null) => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function publish(update: AvailableUpdate) {
  waiting = update
  listeners.forEach(listener => listener(update))
}

/**
 * The build writes `version.json` (precached with the version as its revision). The
 * query keeps the running worker's precache out of the way, so this reads what the
 * server now serves: the waiting worker's version.
 */
async function fetchDeployedVersion(): Promise<string> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
      cache: 'no-store'
    })
    const data = (await response.json()) as { version?: unknown }

    return typeof data.version === 'string' && data.version !== APP_VERSION ? data.version : ''
  } catch {
    return ''
  }
}

async function handleNeedRefresh() {
  const versionName = await fetchDeployedVersion()

  publish({ versionName, key: `web:${versionName}` })
}

function checkWhenVisible() {
  if (document.visibilityState !== 'visible' || !navigator.onLine || !registration) return
  if (Date.now() - lastCheckAt < VISIBLE_RECHECK_MS) return

  lastCheckAt = Date.now()
  void registration.update().catch(() => undefined)
}

/** Once per page load, from `App`. Checks on registration, hourly and on return to the tab. */
export function registerWebUpdates(): void {
  if (updateSW) return

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => void handleNeedRefresh(),
    onRegisteredSW: (_url, swRegistration) => {
      if (!swRegistration) return

      registration = swRegistration
      lastCheckAt = Date.now()
      window.setInterval(checkWhenVisible, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', checkWhenVisible)
    }
  })
  installTestHook()
}

/** Resolves once `worker` is installed (or gone), or after the wait limit. */
function waitForInstall(worker: ServiceWorker): Promise<void> {
  return new Promise(resolve => {
    const done = () => {
      window.clearTimeout(timer)
      worker.removeEventListener('statechange', onState)
      off()
      resolve()
    }
    const onState = () => {
      if (worker.state !== 'installing') done()
    }
    const off = subscribeWebUpdate(done)
    const timer = window.setTimeout(done, INSTALL_WAIT_MS)

    worker.addEventListener('statechange', onState)
  })
}

/** The menu's «بررسی به‌روزرسانی». Rejects when the check could not run (offline, no worker). */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (waiting) return waiting
  if (!registration) throw new Error('No service worker')

  lastCheckAt = Date.now()
  await registration.update()

  const worker = registration.installing

  if (worker) await waitForInstall(worker)
  // `onNeedRefresh` reads the version before it publishes.
  else if (registration.waiting && !waiting) await new Promise(r => setTimeout(r, 1500))

  return waiting
}

/** Activates the waiting worker; the page then reloads once (vite-plugin-pwa). */
export function applyUpdate(): Promise<void> {
  return updateSW?.(true) ?? Promise.resolve()
}

export function status(): AvailableUpdate | null {
  return waiting
}

/**
 * Playwright only (`navigator.webdriver` plus a flag the test sets before load):
 * a stand-in for `onNeedRefresh`, and «به‌روزرسانی» records instead of reloading.
 */
function installTestHook() {
  const testWindow = window as Window & {
    __ACCT_E2E__?: boolean
    __acctWebUpdate?: { needRefresh: (version: string) => void; applied: number }
  }

  if (!navigator.webdriver || !testWindow.__ACCT_E2E__) return

  const hook = {
    applied: 0,
    needRefresh: (version: string) => publish({ versionName: version, key: `web:${version}` })
  }

  testWindow.__acctWebUpdate = hook
  updateSW = async () => {
    hook.applied += 1
  }
}
