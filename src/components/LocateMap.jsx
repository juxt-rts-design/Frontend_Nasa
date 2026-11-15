import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { fmt } from '../ui/format'

const IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function Focus({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    const go = () => {
      map.invalidateSize()
      map.setView([lat, lng], 17, { animate: false })
    }
    go()
    const t = window.setTimeout(go, 120)
    return () => window.clearTimeout(t)
  }, [lat, lng, map])
  return null
}

function place(lat, lng) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'O'
  return `${fmt(Math.abs(lat), 4)}° ${ns} · ${fmt(Math.abs(lng), 4)}° ${ew}`
}

function OpenFullMap({ onOpen }) {
  useMapEvents({
    click() {
      onOpen?.()
    },
  })
  return null
}

/** Carte satellite zoomée sur le feu cliqué, à côté du globe. */
export function LocateMap({ lat, lng, nearby = [], onOpen }) {
  return (
    <div className="locate-map" aria-label="Carte du lieu exact">
      <MapContainer
        center={[lat, lng]}
        zoom={17}
        minZoom={13}
        maxZoom={18}
        zoomControl
        attributionControl={false}
        style={{ height: '100%', width: '100%', cursor: onOpen ? 'pointer' : 'grab' }}
      >
        <TileLayer url={IMAGERY} maxZoom={18} maxNativeZoom={18} />
        <Focus lat={lat} lng={lng} />
        {onOpen && <OpenFullMap onOpen={onOpen} />}
        {nearby.map((p) => (
          <CircleMarker
            key={p.id || p.cellule_id}
            center={[p.lat, p.lng]}
            radius={4}
            pathOptions={{ color: '#ffb089', fillColor: '#ffb089', fillOpacity: 0.85, weight: 0 }}
          />
        ))}
        <CircleMarker
          center={[lat, lng]}
          radius={9}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ff4d2e', fillOpacity: 1 }}
          eventHandlers={onOpen ? { click: () => onOpen() } : undefined}
        />
      </MapContainer>
      <p className="locate-caption">{place(lat, lng)}</p>
      {onOpen && (
        <button type="button" className="locate-to-map" onClick={onOpen}>
          Voir sur la carte
        </button>
      )}
    </div>
  )
}
