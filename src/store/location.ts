import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { areaById, defaultAreaId } from '@/data/locations'

interface LocationState {
  areaId: string
  gpsUsed: boolean
  setArea: (areaId: string, viaGps?: boolean) => void
  reset: () => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      areaId: defaultAreaId,
      gpsUsed: false,
      setArea: (areaId, viaGps = false) =>
        set({
          areaId: areaById(areaId) ? areaId : defaultAreaId,
          gpsUsed: viaGps,
        }),
      reset: () => set({ areaId: defaultAreaId, gpsUsed: false }),
    }),
    { name: 'lz-location' },
  ),
)
