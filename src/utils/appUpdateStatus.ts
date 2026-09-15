export async function hasPendingAppUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return false

  const registration = await navigator.serviceWorker.getRegistration()

  return Boolean(registration?.waiting)
}

export async function syncPendingAppUpdate(onAvailable: () => void): Promise<void> {
  if (await hasPendingAppUpdate()) {
    onAvailable()
  }
}
