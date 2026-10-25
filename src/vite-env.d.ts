/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  /** Browser API key restricted to the Picker API; enables «باز کردن شیت با گوگل». */
  readonly VITE_GOOGLE_API_KEY?: string
  /** Google Cloud project number, passed to Picker.setAppId so picks grant drive.file. */
  readonly VITE_GOOGLE_APP_ID?: string
  /** Address of workers/auth-refresh; unset keeps the popup-based silent token renewal. */
  readonly VITE_AUTH_WORKER_URL?: string
  readonly VITE_BASE_PATH?: string
  /** Public address of this build; goes into the invitation e-mail. Unset drops that line. */
  readonly VITE_APP_URL?: string
  /** Direct APK link of this build's channel; goes into the invitation e-mail. */
  readonly VITE_APP_DOWNLOAD_URL?: string
  /** `dev` on builds from the develop branch; unset in production. */
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
