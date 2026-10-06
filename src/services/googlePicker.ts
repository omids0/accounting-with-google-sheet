import { getAccessToken } from './auth'
import { isNativePlatform } from './googleAuthNative'
import { ensureFreshAccessToken } from './tokenRefresh'

const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js'

const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet'

const LOAD_TIMEOUT_MS = 15_000

export interface PickedSpreadsheet {
  id: string
  name: string
}

/** Picker needs a browser API key and the Cloud project number (its "app id"). */
export function getPickerConfig(): { apiKey: string; appId: string } | null {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY?.trim() ?? ''

  const appId = import.meta.env.VITE_GOOGLE_APP_ID?.trim() ?? ''

  return apiKey && appId ? { apiKey, appId } : null
}

/** Picker runs in a browser popup frame; Android's WebView cannot host it. */
export function isPickerAvailable(): boolean {
  return !isNativePlatform() && getPickerConfig() !== null
}

let pickerApiReady: Promise<GooglePickerNamespace> | null = null

function loadGapiScript(): Promise<void> {
  if (window.gapi) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.src = GAPI_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('بارگذاری Google Picker ناموفق بود'))
    document.head.appendChild(script)
  })
}

/** Loads api.js and the picker module once, only when the user asks for it. */
function loadPickerApi(): Promise<GooglePickerNamespace> {
  pickerApiReady ??= loadGapiScript()
    .then(
      () =>
        new Promise<GooglePickerNamespace>((resolve, reject) => {
          const fail = () => reject(new Error('بارگذاری Google Picker ناموفق بود'))

          window.gapi?.load('picker', {
            callback: () => (window.google?.picker ? resolve(window.google.picker) : fail()),
            onerror: fail,
            timeout: LOAD_TIMEOUT_MS,
            ontimeout: fail
          })
        })
    )
    .catch(err => {
      pickerApiReady = null
      throw err
    })

  return pickerApiReady
}

/**
 * Opens Google Picker on the user's spreadsheets. Picking a file grants this app
 * drive.file access to it, which is how a sheet copied by hand becomes usable.
 * Resolves null when the user closes the picker.
 */
export async function pickSpreadsheetWithGoogle(): Promise<PickedSpreadsheet | null> {
  const config = getPickerConfig()

  if (!config || isNativePlatform()) {
    throw new Error('باز کردن شیت با گوگل در این نسخه فعال نیست')
  }

  await ensureFreshAccessToken()

  const token = getAccessToken()

  const picker = await loadPickerApi()

  return new Promise(resolve => {
    const view = new picker.DocsView(picker.ViewId.SPREADSHEETS)
      .setMimeTypes(SPREADSHEET_MIME)
      .setMode(picker.DocsViewMode.LIST)

    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(config.apiKey)
      .setAppId(config.appId)
      .setLocale('fa')
      .setTitle('شیت حسابداری را انتخاب کنید')
      .setCallback(data => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs?.[0]

          resolve(doc ? { id: doc.id, name: doc.name || doc.id } : null)
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()
      .setVisible(true)
  })
}
