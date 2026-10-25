const fromEnv = (value: string | undefined): string => (value ?? '').trim()

/** Where people open this build of the app (production, or the `/dev/` copy); empty when unset. */
export const APP_URL = fromEnv(import.meta.env.VITE_APP_URL)

/** The APK of this build's channel (latest release, or the rolling «dev-latest»); empty when unset. */
export const APP_DOWNLOAD_URL = fromEnv(import.meta.env.VITE_APP_DOWNLOAD_URL)
