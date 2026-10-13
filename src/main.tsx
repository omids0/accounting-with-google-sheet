import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from './App'
import PrivacyScreen from './components/appLock/PrivacyScreen'
import AppToaster from './components/AppToaster'
import { AppLoadingSkeleton } from './components/skeleton'
import { initializeNativeGoogleAuth, isNativePlatform } from './services/googleAuthNative'
import { initDisplayPrefs } from './utils/displayPrefs'
import { initTheme } from './utils/theme'
import './styles/fonts.css'
import './index.css'

initTheme()
// Text size, contrast, motion and digits (Settings › نمایش), before the first render.
initDisplayPrefs()
// Lets the stylesheet drop effects the Android WebView renders far more slowly than a browser.
if (isNativePlatform()) document.documentElement.classList.add('native')
void initializeNativeGoogleAuth()

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <Suspense fallback={<AppLoadingSkeleton />}>
        <App />
      </Suspense>
      <AppToaster />
      <PrivacyScreen />
    </BrowserRouter>
  </React.StrictMode>
)
