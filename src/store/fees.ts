import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FeeConfig } from '@/types'
import { seedFeeConfig } from '@/services/feeService'
import { envConfig } from '@/config/env'

const initialConfig: FeeConfig = {
  ...seedFeeConfig,
  platformFee: envConfig.demoFees.platformFee,
  freeFeeAbove: envConfig.demoFees.freeFeeAbove,
  deliveryFeeNear: envConfig.demoFees.deliveryFeeNear,
  deliveryFeeFar: envConfig.demoFees.deliveryFeeFar,
}

interface FeeState {
  config: FeeConfig
  update: (patch: Partial<FeeConfig>) => void
  reset: () => void
}

/** Editable demo fee configuration — never treated as real billing logic. */
export const useFeeStore = create<FeeState>()(
  persist(
    (set) => ({
      config: initialConfig,
      update: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      reset: () => set({ config: initialConfig }),
    }),
    { name: 'lz-fees' },
  ),
)
