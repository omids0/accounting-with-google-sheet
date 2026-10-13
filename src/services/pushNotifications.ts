import { upsertPushSubscription } from './reminders'
import type { StoredPushSubscription } from '../types'
import { getDeviceLabel } from '../utils/deviceLabel'

export { getDeviceLabel }

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const raw = atob(base64)

  const output = new Uint8Array(raw.length)

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }

  return output
}

export type PushSupportStatus = 'supported' | 'missing-api' | 'missing-vapid' | 'ios-needs-install'

export function getPushSupportStatus(): PushSupportStatus {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'missing-api'
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true

  if (isIos && !isStandalone) {
    return 'ios-needs-install'
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()

  if (!vapidPublicKey) {
    return 'missing-vapid'
  }

  return 'supported'
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'

  return Notification.permission
}

export type ServiceWorkerStatus = 'ready' | 'pending' | 'missing'

export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  if (!('serviceWorker' in navigator)) return 'missing'

  const existing = await navigator.serviceWorker.getRegistration()

  if (existing?.active) return 'ready'

  const registration = await getServiceWorkerRegistration()

  if (registration?.active) return 'ready'

  return existing ? 'pending' : 'missing'
}

async function getServiceWorkerRegistration(
  timeoutMs = 5000
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  const existing = await navigator.serviceWorker.getRegistration()

  if (existing?.active) return existing

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(resolve => {
        window.setTimeout(() => resolve(null), timeoutMs)
      })
    ])

    return registration
  } catch {
    return null
  }
}

export async function subscribeToPush(): Promise<PushSubscriptionJSON> {
  const status = getPushSupportStatus()

  if (status === 'missing-api') {
    throw new Error('این مرورگر اعلان نمی‌فرستد')
  }
  if (status === 'ios-needs-install') {
    throw new Error('در آیفون اول اپ را به صفحهٔ اصلی (Add to Home Screen) اضافه کنید')
  }
  if (status === 'missing-vapid') {
    throw new Error('اعلان روی این نسخهٔ اپ راه‌اندازی نشده است')
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('اجازهٔ نمایش اعلان داده نشد')
  }

  const registration = await getServiceWorkerRegistration()

  if (!registration) {
    const status = await getServiceWorkerStatus()

    if (status === 'missing' && import.meta.env.DEV) {
      throw new Error('اعلان در حالت توسعه فعال نیست — dev server را دوباره اجرا کنید')
    }
    if (getPushSupportStatus() === 'ios-needs-install') {
      throw new Error('در آیفون اول اپ را به صفحهٔ اصلی (Add to Home Screen) اضافه کنید')
    }
    throw new Error('اعلان‌ها هنوز آماده نیستند؛ صفحه را دوباره باز کنید')
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY!.trim()

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    })
  }

  const json = subscription.toJSON()

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('ثبت این دستگاه برای اعلان ناموفق بود')
  }

  return json
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await getServiceWorkerRegistration()

  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await subscription.unsubscribe()
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscriptionJSON | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const registration = await getServiceWorkerRegistration()

  if (!registration) return null

  const subscription = await registration.pushManager.getSubscription()

  return subscription?.toJSON() ?? null
}

export function toStoredPushSubscription(json: PushSubscriptionJSON): StoredPushSubscription {
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!
    }
  }
}

export async function showLocalTestNotification(): Promise<void> {
  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('اجازهٔ نمایش اعلان داده نشد')
  }

  const registration = await getServiceWorkerRegistration()

  if (!registration) {
    throw new Error('اعلان‌ها هنوز آماده نیستند؛ صفحه را دوباره باز کنید')
  }
  await registration.showNotification('اعلان آزمایشی', {
    body: 'اعلان‌های این دستگاه کار می‌کند.',
    icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
    badge: `${import.meta.env.BASE_URL}pwa-192x192.png`,
    dir: 'rtl',
    lang: 'fa',
    tag: 'reminder-test'
  })
}

/** Asks the browser for permission (if needed) and registers this device in the sheet. */
export async function subscribeThisDevice(spreadsheetId: string): Promise<void> {
  const subscription = await subscribeToPush()

  await upsertPushSubscription(spreadsheetId, {
    endpoint: subscription.endpoint!,
    p256dh: subscription.keys!.p256dh!,
    auth: subscription.keys!.auth!,
    deviceLabel: getDeviceLabel(),
    updatedAt: new Date().toISOString()
  })
}
