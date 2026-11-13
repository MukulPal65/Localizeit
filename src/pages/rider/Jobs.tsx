import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bike,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Navigation,
  PackageCheck,
  Search,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { acceptDeliveryJob } from '@/services/workflow'
import { Badge, Button, EmptyState, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { cn, formatINR, formatTime } from '@/utils'

export function RiderJobsPage() {
  const [tab, setTab] = useState<'available' | 'history'>('available')
  const [search, setSearch] = useState('')
  const riderId = useAuthStore((s) => s.riderId)
  const rider = useDeliveryStore((s) => s.riders.find((r) => r.id === riderId))
  const jobs = useDeliveryStore((s) => s.jobs)

  const availableJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.status !== 'available') return false
        if (!search) return true
        const query = search.toLowerCase()
        return (
          j.shopName.toLowerCase().includes(query) ||
          j.dropAddress.toLowerCase().includes(query) ||
          j.customerName.toLowerCase().includes(query)
        )
      }),
    [jobs, search],
  )

  const myHistory = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.riderId !== riderId || j.status !== 'delivered') return false
        if (!search) return true
        const query = search.toLowerCase()
        return (
          j.shopName.toLowerCase().includes(query) ||
          j.dropAddress.toLowerCase().includes(query) ||
          j.customerName.toLowerCase().includes(query)
        )
      }),
    [jobs, riderId, search],
  )

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Delivery Jobs"
        subtitle="Claim open pickup requests or review your trip history."
      />

      {/* Tabs */}
      <div className="flex rounded-xl border border-cream-3 bg-white/70 p-1">
        <button
          type="button"
          onClick={() => setTab('available')}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
            tab === 'available'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-brown-500 hover:text-brown-800',
          )}
        >
          Available Now ({jobs.filter((j) => j.status === 'available').length})
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
            tab === 'history'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-brown-500 hover:text-brown-800',
          )}
        >
          My History ({jobs.filter((j) => j.riderId === riderId && j.status === 'delivered').length})
        </button>
      </div>

      {/* Available Tab */}
      {tab === 'available' && (
        <div className="space-y-3">
          {availableJobs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Open Jobs In Your Area"
              description="Whenever a shopkeeper marks an order as Ready For Delivery, it will appear here for pickup."
            />
          ) : (
            availableJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-cream-3 bg-white p-4 shadow-xs transition-shadow hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                      {job.id}
                    </span>
                    <h3 className="text-sm font-bold text-brown-900">{job.shopName}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-heading text-base font-bold text-success">
                      {formatINR(job.payout)}
                    </span>
                    <p className="text-[10px] text-brown-400">Fixed Payout</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 border-t border-cream-2 pt-2.5 text-xs">
                  <div className="flex items-start gap-2 text-brown-600">
                    <MapPin className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-brown-400">Pickup</p>
                      <p className="font-medium text-brown-900">{job.pickupAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-brown-600">
                    <Navigation className="h-4 w-4 shrink-0 text-info mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-brown-400">Delivery Drop</p>
                      <p className="font-medium text-brown-900">{job.customerName}</p>
                      <p className="text-[11px] text-brown-500">{job.dropAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-cream-2 pt-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={job.codAmount > 0 ? 'warning' : 'neutral'}>
                      {job.codAmount > 0 ? `Collect ${formatINR(job.codAmount)} Cash` : 'Prepaid'}
                    </Badge>
                    <span className="text-[11px] font-medium text-brown-500">{job.distanceKm} km</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (rider) acceptDeliveryJob(job.id, rider.id)
                    }}
                    leftIcon={Bike}
                  >
                    Accept Job
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {myHistory.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="No Completed Trips Yet"
              description="Completed jobs and earnings records will be logged here."
            />
          ) : (
            myHistory.map((job) => (
              <div key={job.id} className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-brown-900">{job.shopName}</span>
                      <Badge tone="success">
                        Delivered
                      </Badge>
                    </div>
                    <p className="text-[11px] text-brown-500">To: {job.customerName}</p>
                    <p className="text-[10px] text-brown-400">
                      {job.deliveredAt ? `Delivered at ${formatTime(job.deliveredAt)}` : 'Completed'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-sm font-bold text-brown-900">
                      +{formatINR(job.payout)}
                    </span>
                    <p className="text-[10px] text-brown-400">{job.distanceKm} km</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <DemoNote>Accepting a job moves it directly to your Active jobs tab and assigns you in the system.</DemoNote>
    </div>
  )
}
