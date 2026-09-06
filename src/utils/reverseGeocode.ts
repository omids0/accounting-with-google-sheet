type NominatimAddress = {
  road?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  country?: string
}

type NominatimReverseResponse = {
  display_name?: string
  address?: NominatimAddress
}

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'fa',
  'User-Agent': 'PersonalAccountingPWA/1.0 (counterparty-location-picker)'
} as const

export type GeocodeSearchResult = {
  lat: number
  lng: number
  label: string
}

type NominatimSearchResponse = {
  lat?: string
  lon?: string
  display_name?: string
  name?: string
}

function formatNominatimAddress(data: NominatimReverseResponse): string {
  const address = data.address

  if (!address) {
    return String(data.display_name ?? '').trim()
  }

  const locality = address.city || address.town || address.village || address.county
  const parts = [
    address.road,
    address.neighbourhood || address.suburb,
    locality,
    address.state,
    address.country
  ]
    .map(part => String(part ?? '').trim())
    .filter(Boolean)

  if (parts.length > 0) return parts.join('، ')

  return String(data.display_name ?? '').trim()
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    'accept-language': 'fa'
  })

  const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
    headers: NOMINATIM_HEADERS
  })

  if (!response.ok) return null

  const data = (await response.json()) as NominatimReverseResponse
  const formatted = formatNominatimAddress(data)

  return formatted || null
}

export async function searchGeocode(query: string): Promise<GeocodeSearchResult[]> {
  const trimmed = query.trim()

  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: trimmed,
    limit: '6',
    'accept-language': 'fa'
  })

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: NOMINATIM_HEADERS
  })

  if (!response.ok) return []

  const data = (await response.json()) as NominatimSearchResponse[]

  if (!Array.isArray(data)) return []

  return data
    .map(item => {
      const lat = Number(item.lat)
      const lng = Number(item.lon)
      const label = String(item.display_name ?? item.name ?? '').trim()

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null

      return { lat, lng, label }
    })
    .filter((item): item is GeocodeSearchResult => item !== null)
}
