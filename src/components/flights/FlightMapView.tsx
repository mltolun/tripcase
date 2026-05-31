import { useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Flight, Layover } from '../../lib/database.types'
import { getAirportCoords } from '../../lib/airports'
import { haversineKm } from '../../lib/geo'
import { formatDate, formatTime, airlineLogoUrl } from '../../lib/utils'
import 'leaflet/dist/leaflet.css'

const ROUTE_COLORS = [
  '#F59E0B',
  '#3B82F6',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
]

interface RouteSegment {
  fromCode: string
  fromLat: number
  fromLng: number
  toCode: string
  toLat: number
  toLng: number
  distance: number
}

interface FlightRoute {
  flight: Flight
  segments: RouteSegment[]
  totalDistance: number
  color: string
}

function getCurveMidpoint(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  fromCode: string, toCode: string,
  offset: number
): [number, number] {
  const midLat = (fromLat + toLat) / 2
  const midLng = (fromLng + toLng) / 2

  const dLat = toLat - fromLat
  const dLng = toLng - fromLng

  const avgLat = ((fromLat + toLat) / 2 * Math.PI) / 180
  const cosLat = Math.max(Math.cos(avgLat), 0.01)
  const adjDLng = dLng * cosLat
  const len = Math.sqrt(dLat * dLat + adjDLng * adjDLng)
  if (len < 1e-6) return [midLat, midLng]

  const perpLat = -adjDLng / len
  const perpLng = dLat / len

  const canonical = fromCode < toCode
  const adjustedOffset = canonical ? offset : -offset

  const spacing = 0.8
  const off = adjustedOffset * spacing

  return [
    midLat + perpLat * off,
    midLng + perpLng * off / cosLat,
  ]
}

function segmentKey(a: string, b: string) {
  return [a, b].sort().join('-')
}

function buildRoutes(flights: Flight[]): FlightRoute[] {
  const routes = flights.map((f, i) => {
    const dep = getAirportCoords(f.departure_airport_code)
    const arr = getAirportCoords(f.arrival_airport_code)
    const layovers = (f.layovers as Layover[] | null) ?? []

    const waypoints: { code: string; lat: number; lng: number }[] = []

    if (dep) waypoints.push({ code: f.departure_airport_code, lat: dep.lat, lng: dep.lng })

    for (const ly of layovers) {
      const coords = getAirportCoords(ly.airport_code)
      if (coords) waypoints.push({ code: ly.airport_code, lat: coords.lat, lng: coords.lng })
    }

    if (arr) waypoints.push({ code: f.arrival_airport_code, lat: arr.lat, lng: arr.lng })

    const segments: RouteSegment[] = []
    let totalDistance = 0

    for (let s = 0; s < waypoints.length - 1; s++) {
      const from = waypoints[s]
      const to = waypoints[s + 1]
      const dist = haversineKm(from.lat, from.lng, to.lat, to.lng)
      segments.push({
        fromCode: from.code,
        fromLat: from.lat,
        fromLng: from.lng,
        toCode: to.code,
        toLat: to.lat,
        toLng: to.lng,
        distance: dist,
      })
      totalDistance += dist
    }

    return { flight: f, segments, totalDistance, color: ROUTE_COLORS[i % ROUTE_COLORS.length] }
  })

  const overlapGroups = new Map<string, { routeIdx: number; segIdx: number }[]>()
  for (let ri = 0; ri < routes.length; ri++) {
    for (let si = 0; si < routes[ri].segments.length; si++) {
      const s = routes[ri].segments[si]
      const key = segmentKey(s.fromCode, s.toCode)
      const list = overlapGroups.get(key) ?? []
      list.push({ routeIdx: ri, segIdx: si })
      overlapGroups.set(key, list)
    }
  }

  const segmentOffsets = new Map<string, number>()
  for (const [, list] of overlapGroups) {
    if (list.length < 2) continue
    const mid = (list.length - 1) / 2
    list.forEach((item, idx) => {
      const key = `${item.routeIdx}-${item.segIdx}`
      segmentOffsets.set(key, idx - mid)
    })
  }

  for (let ri = 0; ri < routes.length; ri++) {
    for (let si = 0; si < routes[ri].segments.length; si++) {
      const key = `${ri}-${si}`
      const offset = segmentOffsets.get(key) ?? 0
      if (offset !== 0) {
        const s = routes[ri].segments[si]
        ;(s as any).curveOffset = offset
      }
    }
  }

  return routes
}

function getSegmentPositions(seg: RouteSegment): [number, number][] {
  const offset = (seg as any).curveOffset as number | undefined
  if (offset == null || offset === 0) return [[seg.fromLat, seg.fromLng], [seg.toLat, seg.toLng]]
  const mid = getCurveMidpoint(seg.fromLat, seg.fromLng, seg.toLat, seg.toLng, seg.fromCode, seg.toCode, offset)
  return [[seg.fromLat, seg.fromLng], mid, [seg.toLat, seg.toLng]]
}

function getBounds(routes: FlightRoute[]) {
  const allCoords: [number, number][] = []
  for (const r of routes) {
    for (const s of r.segments) {
      allCoords.push([s.fromLat, s.fromLng])
      allCoords.push([s.toLat, s.toLng])
    }
  }
  if (allCoords.length === 0) return null
  const lats = allCoords.map(c => c[0])
  const lngs = allCoords.map(c => c[1])
  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  )
}

function MapBounds({ bounds }: { bounds: ReturnType<typeof getBounds> }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [map, bounds])
  return null
}

function markerIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

interface FlightMapViewProps {
  flights: Flight[]
}

export function FlightMapView({ flights }: FlightMapViewProps) {
  const routes = useMemo(() => buildRoutes(flights), [flights])
  const totalKm = useMemo(() => routes.reduce((sum, r) => sum + r.totalDistance, 0), [routes])
  const bounds = useMemo(() => getBounds(routes), [routes])

  const center: [number, number] = bounds
    ? [bounds.getCenter().lat, bounds.getCenter().lng]
    : [20, 0]

  return (
    <div className="space-y-4">
      <div className="bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 flex items-center gap-4 text-sm overflow-x-auto">
        <span className="text-slate-600 whitespace-nowrap">
          {flights.length} flight{flights.length !== 1 ? 's' : ''}
        </span>
        <span className="text-slate-400 shrink-0">·</span>
        <span className="text-slate-600 whitespace-nowrap">
          <strong className="text-slate-900 font-mono">{totalKm.toLocaleString()}</strong> km total
        </span>
        <span className="text-slate-400 shrink-0">·</span>
        <div className="flex items-center gap-2 flex-wrap">
          {routes.map((r) => (
            <span key={r.flight.id} className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: r.color }} />
              {r.flight.departure_airport_code}–{r.flight.arrival_airport_code}
              <span className="font-mono">({r.totalDistance}km)</span>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-ink-700">
        <MapContainer
          center={center}
          zoom={3}
          style={{ height: '520px', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds bounds={bounds} />

          {routes.map((route) => {
            const visited = new Set<string>()

            return (
              <div key={route.flight.id}>
                {route.segments.length > 0 && (
                  <Polyline
                    positions={route.segments.flatMap(s => getSegmentPositions(s))}
                    pathOptions={{ color: route.color, weight: 3, opacity: 0.8 }}
                  />
                )}

                {route.segments.map((seg) => {
                  const markerKey = `${route.flight.id}-${seg.fromCode}`
                  const showPopup = !visited.has(seg.fromCode)
                  visited.add(seg.fromCode)

                  return (
                    <Marker
                      key={markerKey}
                      position={[seg.fromLat, seg.fromLng]}
                      icon={markerIcon(route.color)}
                    >
                      <Tooltip direction="top" offset={[0, -8]}>
                        <span className="text-xs font-medium">{seg.fromCode}</span>
                      </Tooltip>
                      {showPopup && (
                        <Popup>
                          <FlightPopupContent flight={route.flight} />
                        </Popup>
                      )}
                    </Marker>
                  )
                })}

                {route.segments.length > 0 && (() => {
                  const last = route.segments[route.segments.length - 1]
                  return (
                    <Marker
                      key={`${route.flight.id}-${last.toCode}-end`}
                      position={[last.toLat, last.toLng]}
                      icon={markerIcon(route.color)}
                    >
                      <Tooltip direction="top" offset={[0, -8]}>
                        <span className="text-xs font-medium">{last.toCode}</span>
                      </Tooltip>
                    </Marker>
                  )
                })()}
              </div>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}

function FlightPopupContent({ flight }: { flight: Flight }) {
  return (
    <div className="text-xs space-y-1 min-w-[160px]">
      <div className="flex items-center gap-2 font-semibold text-sm mb-1">
        {flight.airline_iata && (
          <img src={airlineLogoUrl(flight.airline_iata)} alt="" className="w-5 h-5 object-contain" />
        )}
        {flight.airline_name} {flight.flight_number}
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">{flight.departure_airport_code}</span>
        <span className="font-mono">{formatDate(flight.departure_time, 'EEE d MMM')} {formatTime(flight.departure_time)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">{flight.arrival_airport_code}</span>
        <span className="font-mono">{formatDate(flight.arrival_time, 'EEE d MMM')} {formatTime(flight.arrival_time)}</span>
      </div>
    </div>
  )
}
