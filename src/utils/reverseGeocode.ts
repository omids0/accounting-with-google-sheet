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
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'fa',
      'User-Agent': 'PersonalAccountingPWA/1.0 (counterparty-location-picker)'
    }
  })

  if (!response.ok) return null

  const data = (await response.json()) as NominatimReverseResponse
  const formatted = formatNominatimAddress(data)

  return formatted || null
}
