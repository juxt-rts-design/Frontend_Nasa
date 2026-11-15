import { usePlace } from '../api/place'

/** Province, localité et forêt ou aire protégée pour un point. */
export function PlaceName({ lat, lng }) {
  const { place, loading } = usePlace(lat, lng)
  if (!place) return null
  const titre = place.titre || (loading ? 'Recherche du lieu…' : (place.pays || 'Lieu non répertorié'))
  return (
    <div className="place-name">
      {place.role && <span className="place-role">{place.role}</span>}
      <strong>{titre}</strong>
      {place.sous && <span>{place.sous}</span>}
      {place.ville && <span>{place.ville}</span>}
      {place.foret && <span>{place.foret}</span>}
      {loading && place.titre && <span className="faint">Précision de la province…</span>}
      {!loading && place.source && <span className="faint">Source : {place.source}</span>}
    </div>
  )
}
