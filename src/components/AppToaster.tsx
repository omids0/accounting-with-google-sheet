import { Toaster } from 'react-hot-toast'

import { appToasterClass } from './ui/displayStyles'

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      containerClassName={appToasterClass}
      toastOptions={{
        duration: 3500,
        style: {
          fontFamily: 'var(--font)',
          direction: 'rtl',
          fontSize: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          maxWidth: 'min(90vw, 24rem)'
        },
        success: {
          style: {
            background: '#f0fdf4',
            color: 'var(--color-success)',
            border: '1px solid #bbf7d0'
          }
        },
        error: {
          style: {
            background: '#fef2f2',
            color: 'var(--color-danger)',
            border: '1px solid #fecaca'
          }
        }
      }}
    />
  )
}
