import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle, CircleMarker, GeoJSON, MapContainer, Polygon, Rectangle, TileLayer, useMap, useMapEvents,
} from 'react-leaflet'
import { countryAtPoint, mapZoomFor } from '../data/countries'
import { useApp } from '../state'
import { fetchGlobe } from '../api/client'
import { FRP_LEVELS, HARM_COLOR, frpNiveau, satColor } from '../data/engine'
import { useAsync } from '../ui/hooks'
import { Icon } from '../ui/icons'
import { Hint, Segmented, Spinner, UniqueToggle, SatChips } from '../ui/controls'
import { fmt, fmtPeriod } from '../ui/format'
import { FireDetail } from './FireDetail'
const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tuiles Esri, Maxar, Earthstar',
    max: 18,
  },
  plan: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
    max: 19,
  },
}

function gibsUrl(date) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
}

function Fly({ focus, region, basemap }) {
  const map = useMap()
  const pin = focus?.from === 'locate' || focus?.from === 'notif'
  useEffect(() => {
    if (pin) return undefined
    map.flyTo([region.focus.lat, region.focus.lng], mapZoomFor(region), { duration: 0.7 })
    return undefined
  }, [region, map, pin])
  useEffect(() => {
    if (focus?.lat == null) return undefined
    const z = pin ? 15 : 8
    map.flyTo([focus.lat, focus.lng], z, { duration: 0.85 })
    return undefined
  }, [focus, map, pin])
  useEffect(() => {
    if (pin) return
    if (basemap === 'gibs' && map.getZoom() > 8) map.setZoom(7)
  }, [basemap, map, pin])
  return null
}

function DrawClicks({ tool, onAdd, onMove, onCountry, ignoreClick }) {
  useMapEvents({
    click(e) {
      if (ignoreClick?.current) {
        ignoreClick.current = false
        return
      }
      if (tool) {
        onAdd([Number(e.latlng.lng.toFixed(5)), Number(e.latlng.lat.toFixed(5))])
        return
      }
      const hit = countryAtPoint(e.latlng.lat, e.latlng.lng)
      if (hit) onCountry(hit.id)
    },
    mousemove(e) {
      if (tool === 'rectangle') onMove([Number(e.latlng.lng.toFixed(5)), Number(e.latlng.lat.toFixed(5))])
    },
  })
  return null
}

function rectRing([lo1, la1], [lo2, la2]) {
  return [[lo1, la1], [lo2, la1], [lo2, la2], [lo1, la2], [lo1, la1]]
}

export function MapView() {
  const app = useApp()
  const [basemap, setBasemap] = useState('satellite')
  const [colorMode, setColorMode] = useState(app.mode === 'brut' ? 'satellite' : 'harmonise')
  const brut = app.mode === 'brut'
  const satKey = app.effectiveSats.join('|')
  const [tool, setTool] = useState(null)
  const [draft, setDraft] = useState([])
  const [hoverPt, setHoverPt] = useState(null)
  const [nom, setNom] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [rayon, setRayon] = useState(50)
  const [centre, setCentre] = useState(null)
  const ignoreCountryClick = useRef(false)
  useEffect(() => {
    setColorMode(brut ? 'satellite' : 'harmonise')
  }, [brut])

  const { data, loading } = useAsync(() => fetchGlobe({
    dateDebut: app.dateDebut,
    dateFin: app.dateFin,
    region: app.regionId,
    limit: 5000,
    mode: app.mode,
    satellites: app.effectiveSats,
    spec: app.spec,
  }), [app.dateDebut, app.dateFin, app.regionId, app.mode, satKey, app.spec])

  const points = useMemo(() => data?.points || [], [data])
  const pinLat = Number(app.selected?.lat ?? app.focus?.lat)
  const pinLng = Number(app.selected?.lng ?? app.selected?.lon ?? app.focus?.lng)
  const hasPin = Number.isFinite(pinLat) && Number.isFinite(pinLng)
  const startCenter = hasPin && (app.focus?.from === 'locate' || app.focus?.from === 'notif')
    ? [pinLat, pinLng]
    : [app.region.focus.lat, app.region.focus.lng]
  const startZoom = hasPin && (app.focus?.from === 'locate' || app.focus?.from === 'notif')
    ? 15
    : mapZoomFor(app.region)
  const tile = basemap === 'gibs'
    ? { url: gibsUrl(app.dateFin), attribution: 'NASA GIBS · MODIS Terra Corrected Reflectance', max: 9 }
    : TILES[basemap]

  const ring = useMemo(() => {
    if (tool === 'rectangle' && draft.length === 2) return rectRing(draft[0], draft[1])
    if (tool === 'polygone' && draft.length >= 3) return [...draft, draft[0]]
    return null
  }, [tool, draft])

  function addPoint(pair) {
    if (tool === 'cercle') {
      setCentre([pair[1], pair[0]])
      return
    }
    if (tool === 'rectangle') setDraft((d) => (d.length >= 2 ? [pair] : [...d, pair]))
    else setDraft((d) => [...d, pair])
  }

  function startTool(t) {
    setTool(t)
    setDraft([])
    setCentre(null)
  }

  function apply() {
    if (tool === 'cercle' && centre) {
      app.applyTempCircle({ nom: nom.trim() || `Zone au ${app.region.nom}`, lat_centre: centre[0], lon_centre: centre[1], rayon_km: Number(rayon) || 50 })
      setTool(null)
      setCentre(null)
      return
    }
    if (!ring) return
    app.applyTempZone(ring, nom.trim() || `Zone au ${app.region.nom}`)
    setTool(null)
    setDraft([])
  }

  async function save() {
    if (centre || (app.tempZone?.lat_centre != null && !ring)) {
      const c = centre || [app.tempZone.lat_centre, app.tempZone.lon_centre]
      const zone = await app.addZone({
        nom: nom.trim() || `Zone au ${app.region.nom}`,
        lat_centre: c[0],
        lon_centre: c[1],
        rayon_km: Number(rayon) || app.tempZone?.rayon_km || 50,
      })
      if (zone) {
        setTool(null)
        setDraft([])
        setCentre(null)
      }
      return
    }
    const r = ring || app.tempZone?.geojson?.coordinates?.[0]
    if (!r) return
    const zone = await app.addZone({ nom: nom.trim() || `Zone au ${app.region.nom}`, ring: r })
    if (zone) {
      setTool(null)
      setDraft([])
    }
  }

  function flyLatLon(e) {
    e.preventDefault()
    const la = Number(String(lat).replace(',', '.'))
    const lo = Number(String(lon).replace(',', '.'))
    if (Number.isNaN(la) || Number.isNaN(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      app.notify('Latitude entre −90 et 90, longitude entre −180 et 180.')
      return
    }
    app.setFocus({ lat: la, lng: lo, token: Date.now() })
  }

  function colorOf(p) {
    if (colorMode === 'puissance') return frpNiveau(p.frp_max || p.frp).couleur
    if (brut) return satColor(p.satellite)
    return HARM_COLOR
  }

  const draftPositions = draft.map(([lo, la]) => [la, lo])
  const rectPreview = tool === 'rectangle' && draft.length === 1 && hoverPt ? rectRing(draft[0], hoverPt) : null
  const shownZone = app.activeZone?.geojson?.coordinates?.[0]

  return (
    <div className="view-pad">
      <div className="map-layout">
        <div className={`map-canvas${tool ? ' drawing' : ''}`}>
          <MapContainer center={startCenter} zoom={startZoom} preferCanvas style={{ height: '100%', width: '100%' }}>
            <TileLayer key={`${basemap}-${app.dateFin}`} attribution={tile.attribution} url={tile.url} maxZoom={tile.max} maxNativeZoom={tile.max} />
            <Fly focus={app.focus} region={app.region} basemap={basemap} />
            <DrawClicks tool={tool} onAdd={addPoint} onMove={setHoverPt} onCountry={(id) => app.changeRegion(id)} ignoreClick={ignoreCountryClick} />
            {app.region.geojson && app.region.geojson.features && app.region.geojson.features.length > 0 && (
              <GeoJSON
                key={app.regionId}
                data={app.region.geojson}
                style={{ color: '#ffb089', weight: 2, fillColor: '#ff5a36', fillOpacity: 0.06 }}
                interactive={false}
              />
            )}
            {app.zones.filter((z) => z.lat_centre != null).map((z) => (
              <Circle
                key={`z-${z.id}`}
                center={[Number(z.lat_centre), Number(z.lon_centre)]}
                radius={Number(z.rayon_km) * 1000}
                pathOptions={{ color: z.id === app.activeZoneId ? '#ffd6ba' : '#7bdff2', weight: z.id === app.activeZoneId ? 2 : 1, fillOpacity: 0.08 }}
              />
            ))}
            {centre && (
              <Circle center={centre} radius={(Number(rayon) || 50) * 1000} pathOptions={{ color: '#ffb089', weight: 2, fillOpacity: 0.12 }} />
            )}
            {points.map((p) => {
              const c = colorOf(p)
              const la = p.latitude ?? p.lat
              const lo = p.longitude ?? p.lng
              const on = app.selected?.id === p.id
                || (app.selected?.cellule_id != null && app.selected.cellule_id === p.cellule_id)
                || (hasPin && Math.abs(la - pinLat) < 1e-3 && Math.abs(lo - pinLng) < 1e-3)
              const kind = brut ? 'detection' : 'cellule'
              return (
                <CircleMarker
                  key={p.cellule_id || p.id}
                  center={[la, lo]}
                  radius={brut
                    ? (on ? 6 : 4) + Math.sqrt(Math.max(0, p.frp || 1)) * 0.12
                    : (on ? 5 : 3.2) + Math.sqrt(Math.max(0, p.nb_detections || 1)) * 0.18}
                  pathOptions={{ color: on ? '#ffffff' : c, fillColor: c, fillOpacity: 0.78, weight: on ? 2 : 0 }}
                  eventHandlers={{ click: () => {
                    ignoreCountryClick.current = true
                    if (!tool) app.setSelected({ ...p, kind, lat: la, lng: lo })
                  } }}
                />
              )
            })}
            {hasPin && (
              <CircleMarker
                center={[pinLat, pinLng]}
                radius={11}
                pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ff4d2e', fillOpacity: 1 }}
              />
            )}
            {shownZone && !tool && (
              <Polygon positions={shownZone.map(([lo, la]) => [la, lo])} pathOptions={{ color: '#ff4d2e', weight: 2.5, fillOpacity: 0.05, dashArray: app.activeZone?.temp ? '6 6' : undefined }} />
            )}
            {app.zones.filter((z) => z.id !== app.activeZoneId && z.geojson?.coordinates?.[0] && z.lat_centre == null).map((z) => (
              <Polygon key={z.id} positions={z.geojson.coordinates[0].map(([lo, la]) => [la, lo])} pathOptions={{ color: '#e6b15c', weight: 1, fillOpacity: 0.02 }} />
            ))}
            {tool === 'polygone' && draft.length > 0 && <Polygon positions={draftPositions} pathOptions={{ color: '#ffb089', dashArray: '4 4', weight: 2 }} />}
            {tool === 'polygone' && draft.map(([lo, la], i) => (
              <CircleMarker key={i} center={[la, lo]} radius={4} pathOptions={{ color: '#ffb089', fillColor: '#ffb089', fillOpacity: 1 }} />
            ))}
            {rectPreview && <Rectangle bounds={[[rectPreview[0][1], rectPreview[0][0]], [rectPreview[2][1], rectPreview[2][0]]]} pathOptions={{ color: '#ffb089', dashArray: '4 4', weight: 2 }} />}
            {tool === 'rectangle' && draft.length === 2 && <Rectangle bounds={[[draft[0][1], draft[0][0]], [draft[1][1], draft[1][0]]]} pathOptions={{ color: '#ffb089', weight: 2 }} />}
          </MapContainer>
          <div className="map-overlay">
            <UniqueToggle />
            {loading && !data && <Spinner label="Chargement…" />}
            {data && (
              <span>
                {loading && <Spinner label="Mise à jour…" />}
                {brut
                  ? <><b>{fmt(data.total, 0)}</b> détections · {fmtPeriod(app.dateDebut, app.dateFin)}</>
                  : <><b>{fmt(data.total, 0)}</b> éq. Aqua · {fmt(data.nb_cellules || points.length)} zones · {fmtPeriod(app.dateDebut, app.dateFin)}</>}
              </span>
            )}
          </div>
          {tool && (
            <div className="map-drawbar">
              <Icon name={tool === 'rectangle' ? 'square' : tool === 'cercle' ? 'target' : 'shape'} size={16} />
              <span>
                {tool === 'cercle'
                  ? (centre ? `Cercle de ${rayon} km — ajustez le rayon à droite` : 'Cliquez le centre du cercle')
                  : tool === 'rectangle'
                    ? (draft.length < 2 ? `Cliquez ${draft.length ? 'le coin opposé' : 'un premier coin'}` : 'Rectangle prêt')
                    : `Cliquez pour poser les sommets · ${draft.length} posé${draft.length > 1 ? 's' : ''}${draft.length >= 3 ? ' · prêt' : ''}`}
              </span>
              <button type="button" className="solid sm" disabled={tool === 'cercle' ? !centre : !ring} onClick={apply}>Ne garder que cette zone</button>
              <button type="button" className="ghost sm" onClick={() => { setTool(null); setDraft([]); setCentre(null) }}>Annuler</button>
            </div>
          )}
        </div>

        <aside className="panel map-side">
          <section className="side-block">
            <p className="kicker">Fond de carte</p>
            <Segmented
              size="sm"
              value={basemap}
              onChange={setBasemap}
              options={[
                { id: 'satellite', label: 'Satellite' },
                { id: 'plan', label: 'Plan' },
                { id: 'gibs', label: 'Photo NASA du jour', hint: 'Photo prise par satellite le dernier jour choisi' },
              ]}
            />
            {basemap === 'gibs' && <p className="muted sm">Photo du {fmtPeriod(app.dateFin, app.dateFin)} prise depuis l’espace : on y voit les fumées et les zones brûlées.</p>}
          </section>

          <details className="tune">
            <summary>{brut ? 'Couleur des points' : 'Couleur des zones'}</summary>
            <Segmented
              size="sm"
              value={colorMode}
              onChange={setColorMode}
              options={brut
                ? [{ id: 'satellite', label: 'Satellite' }, { id: 'puissance', label: 'Chaleur' }]
                : [{ id: 'harmonise', label: 'Harmoniser' }, { id: 'puissance', label: 'Chaleur' }]}
            />
            {colorMode === 'harmonise' && (
              <div className="frp-legend">
                <span style={{ '--c': HARM_COLOR }}><i />Harmoniser · une seule couleur</span>
              </div>
            )}
            {colorMode === 'puissance' && (
              <div className="frp-legend">
                {FRP_LEVELS.map((l) => <span key={l.id} style={{ '--c': l.color }}><i />{l.simple}</span>)}
              </div>
            )}
            <SatChips counts={data?.parSat} compact />
          </details>

          {app.selected?.kind === 'detection' && (
            <section className="side-block">
              <FireDetail fire={app.selected} onClose={() => app.setSelected(null)} compact />
            </section>
          )}
          {app.selected?.kind === 'cellule' && (
            <section className="side-block">
              <p className="kicker">Zone ~28 km · équivalent Aqua</p>
              <p className="muted sm">{fmt(app.selected.nb_detections, 1)} points chauds · z-score {fmt(app.selected.zscore, 1)}</p>
              <button type="button" className="ghost sm" onClick={() => { app.setCellId(app.selected.cellule_id); app.setView('series') }}>Voir la courbe</button>
            </section>
          )}

          <section className="side-block">
            <p className="kicker">Limiter à une zone</p>
            <input className="field" value={nom} onChange={(e) => setNom(e.target.value)} aria-label="Nom de la zone" placeholder="Nommer la zone à dessiner" />
            <div className="row-actions">
              <button type="button" className={tool === 'cercle' ? 'solid sm' : 'ghost sm'} onClick={() => startTool('cercle')}><Icon name="target" size={14} />Cercle</button>
              <button type="button" className={tool === 'polygone' ? 'solid sm' : 'ghost sm'} onClick={() => startTool('polygone')}><Icon name="shape" size={14} />Polygone</button>
              <button type="button" className={tool === 'rectangle' ? 'solid sm' : 'ghost sm'} onClick={() => startTool('rectangle')}><Icon name="square" size={14} />Rectangle</button>
            </div>
            {tool === 'cercle' && (
              <label className="inline-field">Rayon (km)
                <input className="field" type="number" min="1" max="2000" value={rayon} onChange={(e) => setRayon(e.target.value)} />
              </label>
            )}
            {tool === 'cercle' && centre && (
              <p className="muted sm">Centre {centre[0].toFixed(2)}°, {centre[1].toFixed(2)}° · {rayon} km</p>
            )}
            {(ring || centre) && (
              <button type="button" className="ghost sm" onClick={apply}>Appliquer à toutes les vues</button>
            )}
            {(ring || centre || app.activeZoneId === 'temp') && (
              <button type="button" className="ghost sm" onClick={save}>{app.user ? 'Enregistrer dans mes zones' : 'Se connecter pour enregistrer'}</button>
            )}
            {app.activeZone && (
              <p className="zone-active"><Icon name="check" size={14} />Filtre actif : <b>{app.activeZone.nom}</b> <button type="button" className="texty" onClick={app.clearZone}>Retirer</button></p>
            )}
            {app.zones.length > 0 && (
              <div className="zone-list">
                {app.zones.map((z) => (
                  <div key={z.id} className={z.id === app.activeZoneId ? 'on' : ''}>
                    <button type="button" onClick={() => app.setActiveZoneId(z.id === app.activeZoneId ? null : z.id)}>{z.nom}</button>
                    <button type="button" className="icon-btn sm" aria-label={`Supprimer ${z.nom}`} onClick={() => app.removeZone(z.id)}><Icon name="trash" size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <details className="side-block adv">
            <summary><Icon name="target" size={14} />Aller à une position précise</summary>
            <form className="form" onSubmit={flyLatLon}>
              <div className="two">
                <label>Latitude<input className="field" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="−90 à 90" inputMode="decimal" /></label>
                <label>Longitude<input className="field" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="−180 à 180" inputMode="decimal" /></label>
              </div>
              <button type="button" className="ghost sm" onClick={flyLatLon}>Centrer la carte</button>
            </form>
          </details>
          <Hint>{brut
            ? 'La carte suit la période de la barre du haut. Chaque point est une détection satellite (Capteurs).'
            : 'La carte suit la période de la barre du haut. Chaque point est une case ~28 km déjà harmonisée (équivalent Aqua).'}</Hint>
        </aside>
      </div>
    </div>
  )
}
