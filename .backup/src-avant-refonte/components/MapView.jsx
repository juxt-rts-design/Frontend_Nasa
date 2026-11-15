import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useApp } from '../state'
import { fetchCellules, fetchGlobe } from '../api/client'
import { heatColor, confianceColor, fmt, fmtDate, confianceLabel } from '../ui/format'
import { frpNiveau } from '../data/engine'

const TILES = {
  plan: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
    max: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tuiles Esri, Maxar, Earthstar',
    max: 18,
  },
}

function gibsUrl(date) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
}

function Fly({ focus, region, basemap }) {
  const map = useMap()
  useEffect(() => {
    if (focus?.lat != null) map.flyTo([focus.lat, focus.lng], 7, { duration: 0.8 })
    else map.flyTo([region.focus.lat, region.focus.lng], 5, { duration: 0.7 })
  }, [focus, region, map])
  useEffect(() => {
    if (basemap === 'gibs' && map.getZoom() > 8) map.setZoom(6)
  }, [basemap, map])
  return null
}

function DrawClicks({ enabled, onAdd }) {
  useMapEvents({
    click(e) {
      if (enabled) onAdd([Number(e.latlng.lng.toFixed(5)), Number(e.latlng.lat.toFixed(5))])
    },
  })
  return null
}

export function MapView() {
  const app = useApp()
  const [basemap, setBasemap] = useState('satellite')
  const [showCells, setShowCells] = useState(true)
  const [points, setPoints] = useState([])
  const [cells, setCells] = useState([])
  const [drawing, setDrawing] = useState(false)
  const [draft, setDraft] = useState([])
  const [nom, setNom] = useState('Forêt de la Lopé')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const ring = app.activeZone?.geojson?.coordinates?.[0]

  useEffect(() => {
    let cancel = false
    fetchGlobe({
      dateDebut: app.dateFin,
      dateFin: app.dateFin,
      mode: 'combine',
      satellites: app.satellites,
      region: app.regionId,
      satelliteRef: 'Aqua',
      zoneRing: ring,
    }).then((res) => { if (!cancel) setPoints(res.points || []) })
    fetchCellules({
      region: app.regionId,
      dateDebut: app.dateFin,
      dateFin: app.dateFin,
      zoneRing: ring,
      latMin: app.region.latMin,
      latMax: app.region.latMax,
      lonMin: app.region.lonMin,
      lonMax: app.region.lonMax,
    }).then((res) => { if (!cancel) setCells(res.slice(0, 350)) })
    return () => { cancel = true }
  }, [app.dateFin, app.regionId, app.activeZoneId, ring, app.region, app.satellites])

  const shown = useMemo(() => points.slice(0, 1800), [points])
  const maxCell = Math.max(1, ...cells.map((c) => c.total_detections || 0))
  const tile = basemap === 'gibs'
    ? { url: gibsUrl(app.dateFin), attribution: 'NASA GIBS · MODIS Terra Corrected Reflectance', max: 9 }
    : TILES[basemap]

  function saveZone() {
    if (draft.length < 3) return
    const closed = [...draft, draft[0]]
    const zone = app.addZone({ nom, ring: closed })
    if (zone) {
      setDrawing(false)
      setDraft([])
    }
  }

  function flyLatLon(e) {
    e.preventDefault()
    const la = Number(lat)
    const lo = Number(lon)
    if (Number.isNaN(la) || Number.isNaN(lo)) return
    app.setFocus({ lat: la, lng: lo, token: Date.now() })
  }

  return (
    <div className="view-pad">
      <div className="map-layout">
        <div className="map-canvas">
          <MapContainer center={[app.region.focus.lat, app.region.focus.lng]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer key={`${basemap}-${app.dateFin}`} attribution={tile.attribution} url={tile.url} maxZoom={tile.max} maxNativeZoom={tile.max} />
            <Fly focus={app.focus} region={app.region} basemap={basemap} />
            <DrawClicks enabled={drawing} onAdd={(pair) => setDraft((d) => [...d, pair])} />
            {showCells && cells.map((c) => {
              const paint = heatColor(c.total_detections, maxCell)
              return (
                <Rectangle
                  key={c.cellule_id}
                  bounds={[[c.lat_centre - 0.05, c.lon_centre - 0.05], [c.lat_centre + 0.05, c.lon_centre + 0.05]]}
                  pathOptions={{ color: paint.color, weight: 1, fillColor: paint.color, fillOpacity: 0.28 }}
                  eventHandlers={{ click: () => { app.setCellId(c.cellule_id); app.setSelected({ ...c, kind: 'cellule', lat: c.lat_centre, lng: c.lon_centre }) } }}
                />
              )
            })}
            {shown.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.latitude, p.longitude]}
                radius={3 + Math.sqrt(p.frp || 1) * 0.45}
                pathOptions={{ color: confianceColor(p.confidence, p.instrument), fillColor: confianceColor(p.confidence, p.instrument), fillOpacity: 0.9, weight: 0 }}
                eventHandlers={{ click: () => app.setSelected({ ...p, kind: 'detection', lat: p.latitude, lng: p.longitude }) }}
              />
            ))}
            {draft.length > 0 && <Polygon positions={draft.map(([lo, la]) => [la, lo])} pathOptions={{ color: '#ffb089', dashArray: '4 4' }} />}
            {app.zones.map((z) => (
              <Polygon
                key={z.id}
                positions={z.geojson.coordinates[0].map(([lo, la]) => [la, lo])}
                pathOptions={{ color: z.id === app.activeZoneId ? '#ff4d2e' : '#e6b15c', weight: z.id === app.activeZoneId ? 3 : 1, fillOpacity: 0.05 }}
              />
            ))}
          </MapContainer>
        </div>
        <aside className="panel map-side">
          <p className="kicker">{fmtDate(app.dateFin)}</p>
          <h2 className="panel-title" style={{ fontSize: 28 }}>Carte</h2>
          <div className="seg">
            <button aria-pressed={basemap === 'satellite'} onClick={() => setBasemap('satellite')}>Satellite</button>
            <button aria-pressed={basemap === 'plan'} onClick={() => setBasemap('plan')}>Plan</button>
            <button aria-pressed={basemap === 'gibs'} onClick={() => setBasemap('gibs')}>NASA GIBS</button>
          </div>
          <div className="chips">
            <button aria-pressed={showCells} onClick={() => setShowCells((v) => !v)}>Grille 0,1°</button>
          </div>
          <p className="muted">{fmt(points.length)} détections. Les marqueurs suivent la confiance. {points.length > shown.length ? `Affichage des ${fmt(shown.length)} FRP les plus élevés.` : ''}</p>
          <div className="chips">
            <span className="niveau"><i className="dot" style={{ background: '#f0ddb0' }} />Faible</span>
            <span className="niveau"><i className="dot" style={{ background: '#f0a05a' }} />Nominale</span>
            <span className="niveau"><i className="dot" style={{ background: '#ff5a36' }} />Élevée</span>
          </div>
          {app.selected?.kind === 'detection' && (
            <p className="muted">{app.selected.satellite} · {fmt(app.selected.frp, 1)} MW · {frpNiveau(app.selected.frp).niveau} · confiance {confianceLabel(app.selected.confidence)}</p>
          )}
          <form className="form" onSubmit={flyLatLon}>
            <label>Latitude<input className="field" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-0.70" /></label>
            <label>Longitude<input className="field" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="11.70" /></label>
            <button className="ghost" type="submit">Aller à la position</button>
          </form>
          <p className="kicker" style={{ marginTop: 16 }}>Zone d’intérêt</p>
          <p className="muted">{drawing ? 'Cliquez la carte pour poser les sommets.' : 'Un polygone filtre le globe, le calendrier et les séries.'}</p>
          <input className="zone-name" value={nom} onChange={(e) => setNom(e.target.value)} aria-label="Nom de la zone" />
          <div className="row-actions">
            {!drawing && <button className="ghost" onClick={() => { setDrawing(true); setDraft([]) }}>Dessiner</button>}
            {drawing && <button className="solid" onClick={saveZone} disabled={draft.length < 3}>Enregistrer</button>}
            {drawing && <button className="ghost" onClick={() => { setDrawing(false); setDraft([]) }}>Annuler</button>}
          </div>
          {!app.user && <p className="muted">L’enregistrement demande une session.</p>}
          <div className="conv-list">
            {app.zones.map((z) => (
              <button key={z.id} aria-current={z.id === app.activeZoneId} onClick={() => app.setActiveZoneId(z.id === app.activeZoneId ? null : z.id)}>
                {z.nom}
                <span className="texty" style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); app.removeZone(z.id) }}>Retirer</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
