import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActivityEntry, Role } from '@/types'
import { makeId, nowISO } from '@/utils'

interface ActivityState {
  entries: ActivityEntry[]
  log: (entry: {
    actor: string
    role: Role | 'system'
    action: string
    targetType: ActivityEntry['targetType']
    targetLabel: string
    description: string
  }) => void
  reset: () => void
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      entries: [],
      log: (entry) =>
        set((s) => ({
          entries: [
            {
              ...entry,
              id: makeId('ACT'),
              at: nowISO(),
            },
            ...s.entries,
          ].slice(0, 200),
        })),
      reset: () => set({ entries: [] }),
    }),
    { name: 'lz-activity' },
  ),
)
