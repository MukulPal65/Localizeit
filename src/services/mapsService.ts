import { envConfig } from '@/config/env'

export interface RoutePoint {
  latitude: number
  longitude: number
}

export interface RouteResult {
  geometry: Array<[number, number]>
  distanceKm: number
  durationMins: number
}

export async function getDrivingRoute(points: RoutePoint[]): Promise<RouteResult | null> {
  if (!envConfig.maps.openRouteServiceKey || points.length < 2) return null
  const coordinates = points.map((point) => [point.longitude, point.latitude])
  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      Authorization: envConfig.maps.openRouteServiceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coordinates, instructions: false }),
  })
  if (!response.ok) throw new Error(`OpenRouteService returned HTTP ${response.status}`)
  const payload = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: Array<[number, number]> }; properties?: { segments?: Array<{ distance?: number; duration?: number }> } }>
  }
  const feature = payload.features?.[0]
  if (!feature?.geometry?.coordinates) return null
  const segments = feature.properties?.segments ?? []
  return {
    geometry: feature.geometry.coordinates,
    distanceKm: segments.reduce((sum, segment) => sum + Number(segment.distance ?? 0), 0) / 1000,
    durationMins: segments.reduce((sum, segment) => sum + Number(segment.duration ?? 0), 0) / 60,
  }
}
