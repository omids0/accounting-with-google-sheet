/**
 * Asks the browser to keep this site's storage (IndexedDB mirror of the sheets, the write
 * queue, the session) when the device runs low on space or the site is idle. Without it the
 * browser may clear all of it, and a write made offline that has not reached the sheet yet
 * would be lost. Works offline; a browser that does not support it, or refuses, changes nothing.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage

  if (!storage?.persist) return false

  try {
    if (await storage.persisted?.()) return true

    return await storage.persist()
  } catch {
    return false
  }
}
