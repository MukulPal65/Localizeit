import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CodEntry, DeliveryJob, RiderProfile, RiderStatus } from '@/types'
import { makeId, nowISO } from '@/utils'

interface DeliveryState {
  jobs: DeliveryJob[]
  codEntries: CodEntry[]
  riders: RiderProfile[]
  setOnline: (riderId: string, online: boolean) => void
  acceptJob: (jobId: string, riderId: string) => void
  markPickedUp: (jobId: string) => void
  markDelivered: (jobId: string) => void
  handOverCod: (entryId: string) => void
  createJob: (job: DeliveryJob) => void
  assignJob: (jobId: string, riderId: string) => void
  addRider: (rider: RiderProfile) => void
  updateRider: (riderId: string, patch: Partial<RiderProfile>) => void
  setRiderStatus: (riderId: string, status: RiderStatus, reason?: string) => void
  replaceDelivery: (jobs: DeliveryJob[], codEntries: CodEntry[], riders: RiderProfile[]) => void
  resetDelivery: () => void
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      jobs: [],
      codEntries: [],
      riders: [],
      setOnline: (riderId, online) =>
        set((s) => ({
          riders: s.riders.map((r) => (r.id === riderId ? { ...r, online } : r)),
        })),
      acceptJob: (jobId, riderId) =>
        set((s) => ({
          jobs: s.jobs.map((job) =>
            job.id === jobId && job.status === 'available'
              ? { ...job, status: 'accepted', riderId, acceptedAt: nowISO() }
              : job,
          ),
        })),
      markPickedUp: (jobId) =>
        set((s) => ({
          jobs: s.jobs.map((job) =>
            job.id === jobId && job.status === 'accepted'
              ? { ...job, status: 'picked_up', pickedUpAt: nowISO() }
              : job,
          ),
        })),
      markDelivered: (jobId) =>
        set((s) => {
          const job = s.jobs.find((j) => j.id === jobId)
          if (!job || job.status !== 'picked_up') return s
          const deliveredAt = nowISO()
          const codEntries =
            job.codAmount > 0
              ? [
                  {
                    id: makeId('COD'),
                    jobId: job.id,
                    orderId: job.orderId,
                    shopName: job.shopName,
                    customerName: job.customerName,
                    amount: job.codAmount,
                    status: 'pending' as const,
                    collectedAt: deliveredAt,
                  },
                  ...s.codEntries,
                ]
              : s.codEntries
          return {
            jobs: s.jobs.map((j) =>
              j.id === jobId ? { ...j, status: 'delivered', deliveredAt } : j,
            ),
            codEntries,
          }
        }),
      handOverCod: (entryId) =>
        set((s) => ({
          codEntries: s.codEntries.map((entry) =>
            entry.id === entryId
              ? { ...entry, status: 'handed_over', handedOverAt: nowISO() }
              : entry,
          ),
        })),
      createJob: (job) =>
        set((s) =>
          s.jobs.some((j) => j.shopOrderId === job.shopOrderId)
            ? s
            : { jobs: [job, ...s.jobs] },
        ),
      assignJob: (jobId, riderId) =>
        set((s) => ({
          jobs: s.jobs.map((job) =>
            job.id === jobId ? { ...job, riderId, status: job.status === 'available' ? 'accepted' : job.status, acceptedAt: nowISO() } : job,
          ),
        })),
      addRider: (rider) => set((s) => ({ riders: [rider, ...s.riders] })),
      updateRider: (riderId, patch) =>
        set((s) => ({
          riders: s.riders.map((r) => (r.id === riderId ? { ...r, ...patch } : r)),
        })),
      setRiderStatus: (riderId, status, reason) =>
        set((s) => ({
          riders: s.riders.map((r) =>
            r.id === riderId
              ? { ...r, status, rejectionReason: reason ?? r.rejectionReason }
              : r,
          ),
        })),
      replaceDelivery: (jobs, codEntries, riders) => set({ jobs, codEntries, riders }),
      resetDelivery: () => set({ jobs: [], codEntries: [], riders: [] }),
    }),
    { name: 'lz-delivery' },
  ),
)
