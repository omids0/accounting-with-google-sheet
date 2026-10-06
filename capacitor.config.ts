import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.omids0.accounting',
  appName: 'حسابداری شخصی',
  webDir: 'dist',
  android: {
    // Release APKs must not expose the WebView (and its stored tokens) to chrome://inspect.
    webContentsDebuggingEnabled: false
  },
  plugins: {
    LocalNotifications: {
      // Android 5+ ignores the launcher icon in the status bar and needs a flat
      // alpha-only drawable; without this the plugin falls back to the system
      // ic_dialog_info glyph, which looks nothing like the app.
      smallIcon: 'ic_stat_reminder',
      iconColor: '#0F766E'
    },
    GoogleAuth: {
      scopes: [
        'email',
        'profile',
        'openid',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ],
      // Android's requestIdToken() needs the Web client ID (not an Android-type client ID).
      // `serverClientId` below is the same value but is only read on iOS by this plugin.
      clientId: process.env.VITE_GOOGLE_CLIENT_ID ?? '',
      serverClientId: process.env.VITE_GOOGLE_CLIENT_ID ?? ''
    }
  }
}

export default config
