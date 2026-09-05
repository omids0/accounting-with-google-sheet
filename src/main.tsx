import { GoogleOAuthProvider } from '@react-oauth/google'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import AppToaster from './components/AppToaster'
import { initTheme } from './utils/theme'
import './index.css'

initTheme()

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleRouter clientId={clientId}>
      <App />
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
