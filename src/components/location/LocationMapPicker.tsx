import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import type { CounterpartyLocation } from '../../types/counterparties'
import Button from '../ui/Button'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: CounterpartyLocation = { lat: 35.6892, lng: 51.389 }

const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultMarkerIcon

type LocationMapPickerProps = {
  value: CounterpartyLocation | null
  onChange: (value: CounterpartyLocation | null) => void
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

function MapClickHandler({ onPick }: { onPick: (location: CounterpartyLocation) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    }
  })

  return null
}

export default function LocationMapPicker({ value, onChange }: LocationMapPickerProps) {
  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]

  const handleLocate = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      position => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  return (
    <div className="grid gap-2">
      <div
        className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)]"
        style={{ height: '14rem' }}
      >
        <MapContainer
          center={center}
          zoom={value ? 14 : 12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={onChange} />
          {value ? (
            <>
              <Marker position={[value.lat, value.lng]} />
              <MapRecenter center={[value.lat, value.lng]} />
            </>
          ) : null}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleLocate}>
          موقعیت من
        </Button>
        {value ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange(null)}>
            پاک کردن
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-[color-mix(in_srgb,var(--text)_70%,transparent)]">
        {value ? (
          <>
            مختصات انتخاب‌شده:{' '}
            <span dir="ltr">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
          </>
        ) : (
          'روی نقشه ضربه بزنید تا موقعیت ثبت شود.'
        )}
      </p>
    </div>
  )
}
