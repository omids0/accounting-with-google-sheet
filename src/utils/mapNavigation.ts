import { markExternalAppHandoff } from '../services/appLockPolicy'
import type { CounterpartyLocation } from '../types/counterparties'

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
}

function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent)
}

function isMobileDevice(): boolean {
  return isIosDevice() || isAndroidDevice()
}

export function buildMapDirectionsHref(location: CounterpartyLocation): string {
  const { lat, lng } = location
  const coords = `${lat},${lng}`

  if (isIosDevice()) {
    return `maps://?daddr=${encodeURIComponent(coords)}&dirflg=d`
  }

  if (isAndroidDevice()) {
    return `geo:${coords}?q=${encodeURIComponent(coords)}`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`
}

export function openMapDirections(location: CounterpartyLocation): void {
  const href = buildMapDirectionsHref(location)
  const link = document.createElement('a')

  link.href = href
  link.rel = 'noopener noreferrer'

  if (!isMobileDevice()) {
    link.target = '_blank'
  }

  markExternalAppHandoff()

  document.body.appendChild(link)
  link.click()
  link.remove()
}
