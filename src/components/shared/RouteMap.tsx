import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { getDrivingRoute, type RoutePoint } from '@/services/mapsService'
import 'leaflet/dist/leaflet.css'

export function RouteMap({
  points,
  riderProgress = 0,
  className = '',
}: {
  points: RoutePoint[]
  riderProgress?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
    const markers = points.map((point, index) =>
      L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: 'localizeit-map-marker',
          html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${index === 0 ? '#e05d26' : '#287d5a'};border:3px solid white;box-shadow:0 1px 5px #0005"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map),
    )
    void markers

    const drawRoute = async () => {
      let geometry: Array<[number, number]> = points.map((point) => [point.latitude, point.longitude])
      try {
        const route = await getDrivingRoute(points)
        if (route?.geometry.length) {
          geometry = route.geometry.map(([longitude, latitude]) => [latitude, longitude])
        }
      } catch (error) {
        console.warn('OpenRouteService route unavailable; showing a direct route.', error)
      }
      const line = L.polyline(geometry, { color: '#e05d26', weight: 4, opacity: 0.8 }).addTo(map)
      const progressIndex = Math.min(geometry.length - 1, Math.max(0, Math.round((geometry.length - 1) * riderProgress)))
      if (riderProgress > 0) {
        L.circleMarker(geometry[progressIndex], {
          radius: 7,
          color: '#287d5a',
          fillColor: '#78c49b',
          fillOpacity: 1,
          weight: 3,
        }).addTo(map)
      }
      map.fitBounds(line.getBounds().pad(0.15))
      map.invalidateSize()
    }
    void drawRoute()
    const resize = window.setTimeout(() => map.invalidateSize(), 100)
    return () => {
      window.clearTimeout(resize)
      map.remove()
    }
  }, [points, riderProgress])

  return <div ref={containerRef} className={`h-64 w-full overflow-hidden rounded-xl ${className}`} />
}
