import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.omids0.accounting',
  appName: 'حسابداری شخصی',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: [
        'email',
        'profile',
        'openid',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ],
      serverClientId: process.env.VITE_GOOGLE_CLIENT_ID ?? '',
      forceCodeForRefreshToken: true
    }
  }
}

export default config
