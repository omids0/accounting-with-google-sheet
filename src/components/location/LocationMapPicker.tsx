import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useCallback, useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import type { CounterpartyLocation } from '../../types/counterparties'
import { reverseGeocode } from '../../utils/reverseGeocode'
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
  onAddressResolved?: (address: string) => void
  active?: boolean
}

function MapInvalidateSize({ active }: { active: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!active) return

    const raf = window.requestAnimationFrame(() => {
      map.invalidateSize()
    })

    const timeout = window.setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
    }
  }, [active, map])

  return null
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

export default function LocationMapPicker({
  value,
  onChange,
  onAddressResolved,
  active = true
}: LocationMapPickerProps) {
  const [resolvingAddress, setResolvingAddress] = useState(false)

  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]

  const resolveAddress = useCallback(
    async (location: CounterpartyLocation) => {
      if (!onAddressResolved) return

      setResolvingAddress(true)
      try {
        const address = await reverseGeocode(location.lat, location.lng)

        if (address) {
          onAddressResolved(address)
        }
      } finally {
        setResolvingAddress(false)
      }
    },
    [onAddressResolved]
  )

  const handleLocationPick = useCallback(
    (location: CounterpartyLocation) => {
      onChange(location)
      void resolveAddress(location)
    },
    [onChange, resolveAddress]
  )

  const handleLocate = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      position => {
        handleLocationPick({
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
        className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] [&_.leaflet-container]:z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:min-h-[14rem]"
        style={{ height: '14rem' }}
      >
        {active ? (
          <MapContainer
            key="counterparty-location-map"
            center={center}
            zoom={value ? 14 : 12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', minHeight: '14rem' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInvalidateSize active={active} />
            <MapClickHandler onPick={handleLocationPick} />
            {value ? (
              <>
                <Marker position={[value.lat, value.lng]} />
                <MapRecenter center={[value.lat, value.lng]} />
              </>
            ) : null}
          </MapContainer>
        ) : null}
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
        {resolvingAddress ? (
          'در حال تشخیص آدرس...'
        ) : value ? (
          <>
            مختصات انتخاب‌شده:{' '}
            <span dir="ltr">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
            {onAddressResolved ? ' · آدرس در فیلد پایین تکمیل می‌شود.' : null}
          </>
        ) : (
          'روی نقشه ضربه بزنید تا موقعیت و آدرس ثبت شود.'
        )}
      </p>
    </div>
  )
}
