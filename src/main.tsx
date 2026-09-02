import { GoogleOAuthProvider } from '@react-oauth/google'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import AppToaster from './components/AppToaster'
import { initTheme } from './utils/theme'
import './index.css'

initTheme()

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
      <AppToaster />
    </GoogleOAuthProvider>
  </React.StrictMode>
)
