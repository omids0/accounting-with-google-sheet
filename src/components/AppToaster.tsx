import { Toaster } from 'react-hot-toast'

import { appToasterClass } from './ui/displayStyles'

/** The dark theme's tints are translucent: lay one over the surface so the toast stays opaque. */
const tint = (token: string) => `linear-gradient(${token}, ${token}), var(--color-surface)`

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      containerClassName={appToasterClass}
      toastOptions={{
        duration: 3500,
        // Screen readers announce «ذخیره شد» politely; a failed save interrupts.
        ariaProps: { role: 'status', 'aria-live': 'polite' },
        // Theme tokens, so the neutral (info) and the loading toasts follow the dark theme too.
        style: {
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          fontFamily: 'var(--font)',
          direction: 'rtl',
          fontSize: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          maxWidth: 'min(90vw, 24rem)'
        },
        success: {
          style: {
            background: tint('var(--color-success-bg)'),
            color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)'
          }
        },
        error: {
          ariaProps: { role: 'alert', 'aria-live': 'assertive' },
          style: {
            background: tint('var(--color-danger-bg)'),
            color: 'var(--color-danger)',
            border: '1px solid var(--color-danger-border)'
          }
        }
      }}
    />
  )
}
