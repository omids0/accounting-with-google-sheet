import { GoogleOAuthProvider } from '@react-oauth/google'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from './App'
import AppToaster from './components/AppToaster'
import { AppLoadingSkeleton } from './components/skeleton'
import { initializeNativeGoogleAuth, isNativePlatform } from './services/googleAuthNative'
import { initTheme } from './utils/theme'
import './styles/fonts.css'
import './index.css'

initTheme()
// Lets the stylesheet drop effects the Android WebView renders far more slowly than a browser.
if (isNativePlatform()) document.documentElement.classList.add('native')
void initializeNativeGoogleAuth()

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleRouter clientId={clientId}>
      <Suspense fallback={<AppLoadingSkeleton />}>
        <App />
      </Suspense>
      <AppToaster />
    </GoogleRouter>
  </React.StrictMode>
)

function GoogleRouter({ clientId, children }: { clientId: string; children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter basename={routerBasename}>{children}</BrowserRouter>
    </GoogleOAuthProvider>
  )
}
