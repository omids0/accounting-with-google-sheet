/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  /** Browser API key restricted to the Picker API; enables «باز کردن شیت با گوگل». */
  readonly VITE_GOOGLE_API_KEY?: string
  /** Google Cloud project number, passed to Picker.setAppId so picks grant drive.file. */
  readonly VITE_GOOGLE_APP_ID?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
