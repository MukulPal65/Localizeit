import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { areaById, defaultAreaId } from '@/data/locations'

interface LocationState {
  areaId: string
  gpsUsed: boolean
  coordinates?: { latitude: number; longitude: number }
  detectedAddress?: string
  setArea: (areaId: string, viaGps?: boolean) => void
  setCoordinates: (coordinates: { latitude: number; longitude: number }, address?: string) => void
  reset: () => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      areaId: defaultAreaId,
      gpsUsed: false,
      coordinates: undefined,
      detectedAddress: undefined,
      setArea: (areaId, viaGps = false) =>
        set({
          areaId: areaById(areaId) ? areaId : '',
          gpsUsed: viaGps,
        }),
      setCoordinates: (coordinates, address) => set({ coordinates, detectedAddress: address, gpsUsed: true }),
      reset: () => set({ areaId: '', gpsUsed: false, coordinates: undefined, detectedAddress: undefined }),
    }),
    { name: 'lz-location' },
  ),
)
