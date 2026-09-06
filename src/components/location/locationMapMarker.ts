import L from 'leaflet'

export function createLocationMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'location-map-marker',
    html: `
      <span class="location-map-marker__pulse" aria-hidden="true"></span>
      <span class="location-map-marker__core" aria-hidden="true"></span>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    popupAnchor: [0, -26]
  })
}
