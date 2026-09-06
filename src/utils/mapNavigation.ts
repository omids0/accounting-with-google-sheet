import type { CounterpartyLocation } from '../types/counterparties'

export function openMapDirections(location: CounterpartyLocation): void {
  const destination = `${location.lat},${location.lng}`
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}`

  window.open(url, '_blank', 'noopener,noreferrer')
}
