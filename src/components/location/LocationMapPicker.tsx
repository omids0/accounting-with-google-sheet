import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import { createLocationMarkerIcon } from './locationMapMarker'
import LocationMapSearch from './LocationMapSearch'
import {
  locationMapCoordsClass,
  locationMapFrameClass,
  locationMapOverlayClass,
  locationMapShellClass,
  locationMapStatusClass,
  locationMapThemeToggleClass,
  locationMapToolbarClass
} from './locationMapStyles'
import {
  MAP_DEFAULT_HEIGHT,
  MAP_TILE_LAYER,
  mapThemePreferenceLabel,
  nextMapThemePreference,
  resolveMapVisualTheme,
  type MapThemePreference
} from './mapConfig'
import { useAppThemeMode } from '../../hooks/useAppThemeMode'
import type { CounterpartyLocation } from '../../types/counterparties'
import { openMapDirections } from '../../utils/mapNavigation'
import { reverseGeocode } from '../../utils/reverseGeocode'
import Button from '../ui/Button'
import 'leaflet/dist/leaflet.css'
import './locationMap.css'

const DEFAULT_CENTER: CounterpartyLocation = { lat: 35.6892, lng: 51.389 }
const locationMarkerIcon = createLocationMarkerIcon()

L.Marker.prototype.options.icon = locationMarkerIcon

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
  const appTheme = useAppThemeMode()
  const [themePreference, setThemePreference] = useState<MapThemePreference>('auto')
  const [resolvingAddress, setResolvingAddress] = useState(false)

  const visualTheme = resolveMapVisualTheme(themePreference, appTheme)
  const themeLabel = mapThemePreferenceLabel(themePreference, visualTheme)

  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]

  const mapKey = useMemo(() => `counterparty-location-map-${visualTheme}`, [visualTheme])

  const resolveAddress = async (location: CounterpartyLocation) => {
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
  }

  const handleLocationPick = (location: CounterpartyLocation) => {
    onChange(location)
    void resolveAddress(location)
  }

  const handleSearchSelect = (location: CounterpartyLocation, label: string) => {
    onChange(location)

    if (onAddressResolved && label) {
      onAddressResolved(label)
      return
    }

    void resolveAddress(location)
  }

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
    <div className={locationMapShellClass}>
      <LocationMapSearch onSelect={handleSearchSelect} disabled={!active} />

      <div
        className={locationMapFrameClass}
        data-map-theme={visualTheme}
        style={{ height: MAP_DEFAULT_HEIGHT }}
      >
        <div className={locationMapOverlayClass} aria-hidden="true" />

        {active ? (
          <MapContainer
            key={mapKey}
            center={center}
            zoom={value ? 14 : 12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', minHeight: MAP_DEFAULT_HEIGHT }}
          >
            <TileLayer attribution={MAP_TILE_LAYER.attribution} url={MAP_TILE_LAYER.url} />
            <MapInvalidateSize active={active} />
            <MapClickHandler onPick={handleLocationPick} />
            {value ? (
              <>
                <Marker position={[value.lat, value.lng]} icon={locationMarkerIcon} />
                <MapRecenter center={[value.lat, value.lng]} />
              </>
            ) : null}
          </MapContainer>
        ) : null}
      </div>

      <div className={locationMapToolbarClass}>
        <button
          type="button"
          className={locationMapThemeToggleClass}
          onClick={() => setThemePreference(current => nextMapThemePreference(current))}
          aria-label={`تغییر ظاهر نقشه: ${themeLabel}`}
          title={`ظاهر نقشه: ${themeLabel}`}
        >
          <span aria-hidden="true">{visualTheme === 'dark' ? '🌙' : '☀️'}</span>
          <span>{themeLabel}</span>
        </button>
        <Button type="button" variant="secondary" size="sm" onClick={handleLocate}>
          موقعیت من
        </Button>
        {value ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openMapDirections(value)}
            >
              مسیر‌یابی
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => onChange(null)}>
              پاک کردن
            </Button>
          </>
        ) : null}
      </div>

      <div className={locationMapStatusClass}>
        {resolvingAddress ? (
          'در حال تشخیص آدرس...'
        ) : value ? (
          <>
            <span>مختصات انتخاب‌شده: </span>
            <span className={locationMapCoordsClass} dir="ltr">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
            {onAddressResolved ? ' · آدرس در فیلد پایین تکمیل می‌شود.' : null}
          </>
        ) : (
          'روی نقشه ضربه بزنید یا آدرس را جستجو کنید. با دکمه ظاهر نقشه می‌توانید بین حالت روز، شب و خودکار جابه‌جا شوید.'
        )}
      </div>
    </div>
  )
}
