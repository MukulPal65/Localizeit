import { useState, useMemo } from 'react'
import {
  Bike,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
  Wallet,
} from 'lucide-react'
import { useDeliveryStore } from '@/store/delivery'
import { assignJobToRider } from '@/services/workflow'
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { formatINR, formatTime } from '@/utils'

export function AdminDeliveriesPage() {
  const jobs = useDeliveryStore((s) => s.jobs)
  const riders = useDeliveryStore((s) => s.riders)

  const [tab, setTab] = useState<'all' | 'available' | 'active' | 'delivered'>('all')
  const [search, setSearch] = useState('')
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({})

  const activeRiders = useMemo(() => riders.filter((r) => r.status === 'approved'), [riders])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (tab === 'available' && (job.status !== 'available' || job.riderId)) return false
      if (tab === 'active' && !['accepted', 'picked_up'].includes(job.status)) return false
      if (tab === 'delivered' && job.status !== 'delivered') return false

      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        job.id.toLowerCase().includes(q) ||
        job.orderId.toLowerCase().includes(q) ||
        job.shopName.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q)
      )
    })
  }, [jobs, tab, search])

  const unassignedCount = useMemo(
    () => jobs.filter((j) => j.status === 'available' && !j.riderId).length,
    [jobs],
  )

  const handleAssign = (jobId: string) => {
    const riderId = selectedRider[jobId]
    if (!riderId) return
    assignJobToRider(jobId, riderId)
  }

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="Delivery Dispatch Console"
        subtitle="Manage live delivery tasks, allocate jobs to nearby active riders, and track SLAs."
      />

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search Job ID, order, shop..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={Search}
          />
        </div>

        <div className="flex w-full sm:w-auto rounded-xl border border-cream-3 bg-white p-1 text-xs">
          {(['all', 'available', 'active', 'delivered'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 font-semibold capitalize transition-all ${
                tab === key
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-brown-500 hover:text-brown-800'
              }`}
            >
              {key === 'available' ? 'Unassigned' : key}
              {key === 'available' && unassignedCount > 0 && (
                <span className="ml-1.5 rounded-full bg-danger text-white px-1.5 py-0.2 text-[9px]">
                  {unassignedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Deliveries Found"
          description="Adjust your search or filter options to locate active runs."
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const assignedRider = riders.find((r) => r.id === job.riderId)
            const isUnassigned = job.status === 'available' && !job.riderId

            return (
              <Card
                key={job.id}
                className={`p-4 transition-shadow hover:shadow-soft ${
                  isUnassigned ? 'border-danger/40 bg-danger-soft/10' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-2 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-bold text-brown-900">{job.id}</span>
                    <span className="text-xs text-brown-400">Order: {job.orderId}</span>
                    <Badge
                      tone={
                        job.status === 'delivered'
                          ? 'success'
                          : isUnassigned
                            ? 'danger'
                            : 'orange'
                      }
                    >
                      {isUnassigned ? 'UNASSIGNED' : job.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-success">
                      Payout: {formatINR(job.payout)}
                    </span>
                    {job.codAmount > 0 && (
                      <Badge tone="warning">
                        COD {formatINR(job.codAmount)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Route Details */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-brown-700">
                  <div className="flex items-start gap-2">
                    <Store className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-brown-900">{job.shopName}</p>
                      <p className="text-[11px] text-brown-500">{job.pickupAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Navigation className="h-4 w-4 text-info shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-brown-900">{job.customerName}</p>
                      <p className="text-[11px] text-brown-500">{job.dropAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Assigned Rider & Dispatch Actions */}
                <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-cream-2 pt-3">
                  <div className="text-xs">
                    {assignedRider ? (
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4 text-orange-500" />
                        <span className="font-semibold text-brown-900">
                          Assigned: {assignedRider.name}
                        </span>
                        <span className="text-[11px] text-brown-400">({assignedRider.phone})</span>
                      </div>
                    ) : (
                      <span className="text-danger font-semibold text-[11px]">
                        Waiting for rider dispatch
                      </span>
                    )}
                  </div>

                  {/* Manual assignment control if unassigned */}
                  {isUnassigned && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRider[job.id] || ''}
                        onChange={(e) =>
                          setSelectedRider((prev) => ({ ...prev, [job.id]: e.target.value }))
                        }
                        className="rounded-lg border border-cream-4 bg-white px-2.5 py-1 text-xs text-brown-900"
                      >
                        <option value="">Select Rider...</option>
                        {activeRiders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.vehicle} - {r.online ? 'Online' : 'Offline'})
                          </option>
                        ))}
                      </select>

                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!selectedRider[job.id]}
                        onClick={() => handleAssign(job.id)}
                        leftIcon={UserCheck}
                      >
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <DemoNote>Assigning a rider dispatches the task immediately to their active runs console.</DemoNote>
    </div>
  )
}
