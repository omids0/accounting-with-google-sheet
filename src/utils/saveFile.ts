import { Capacitor } from '@capacitor/core'

import { getJalaliParts } from './jalaliDate'

/** Characters a file system rejects, or reads as a folder separator. */
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g

function persianNumber(value: number, digits: number): string {
  return value.toLocaleString('fa-IR', { useGrouping: false, minimumIntegerDigits: digits })
}

/** «چک‌ها.csv» → «چک‌ها ۱۴۰۵-۰۷-۲۰.csv» */
export function exportFileName(filename: string, date = new Date()): string {
  const { year, month, day } = getJalaliParts(date)

  const stamp = `${persianNumber(year, 4)}-${persianNumber(month, 2)}-${persianNumber(day, 2)}`

  const safe = filename.replace(UNSAFE_FILENAME_CHARS, '-')

  const dot = safe.lastIndexOf('.')

  if (dot <= 0) return `${safe} ${stamp}`

  return `${safe.slice(0, dot)} ${stamp}${safe.slice(dot)}`
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const dataUrl = String(reader.result)

      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function shareFromCache(name: string, blob: Blob): Promise<string | null> {
  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share')
  ])

  const { uri } = await Filesystem.writeFile({
    path: name,
    data: await blobToBase64(blob),
    directory: Directory.Cache
  })

  try {
    await Share.share({ title: name, files: [uri], dialogTitle: 'ذخیره یا ارسال فایل' })
  } catch (err) {
    // The Android plugin rejects with "Share canceled" when the sheet is dismissed.
    if (/cancel/i.test(err instanceof Error ? err.message : String(err))) return null
    throw err
  }

  return name
}

/** «ذخیره» on Android: the app's own file in Documents; the share sheet when that fails (Android ≤ 10). */
async function saveToDocuments(name: string, blob: Blob): Promise<string | null> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem')

  try {
    await Filesystem.writeFile({
      path: name,
      data: await blobToBase64(blob),
      directory: Directory.Documents,
      recursive: true
    })

    return name
  } catch {
    return shareFromCache(name, blob)
  }
}

function downloadInBrowser(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Saves an export under a Jalali-dated name: a download on the web, the share
 * sheet on Android so the user chooses where the file goes. Resolves the saved
 * name, or `null` when the user closed the share sheet without choosing.
 * `share: false` («ذخیره») writes the file to Documents on Android instead.
 */
export async function saveExportFile(
  filename: string,
  blob: Blob,
  { share = true }: { share?: boolean } = {}
): Promise<string | null> {
  const name = exportFileName(filename)

  if (Capacitor.isNativePlatform()) {
    return share ? shareFromCache(name, blob) : saveToDocuments(name, blob)
  }

  downloadInBrowser(name, blob)

  return name
}
