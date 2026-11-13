import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlatformSettings {
  platformName: string
  supportPhone: string
  supportEmail: string
  defaultLanguage: string
  codEnabled: boolean
  pickupOnlyPrepaid: boolean
  serviceWaitlistEnabled: boolean
  maintenanceMode: boolean
  autoAssignRiders: boolean
  update: (patch: Partial<PlatformSettings>) => void
  reset: () => void
}

const defaults = {
  platformName: 'LocalizeIt',
  supportPhone: '1800 123 4567',
  supportEmail: 'help@localizeit.example',
  defaultLanguage: 'en',
  codEnabled: true,
  pickupOnlyPrepaid: true,
  serviceWaitlistEnabled: true,
  maintenanceMode: false,
  autoAssignRiders: false,
}

export const useSettingsStore = create<PlatformSettings>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set(defaults),
    }),
    { name: 'lz-settings' },
  ),
)
