import { useState, useMemo } from 'react'
import {
  Ban,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Power,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import { useDeliveryStore } from '@/store/delivery'
import { approveRider, rejectRider, setRiderSuspension } from '@/services/workflow'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import type { RiderProfile } from '@/types'

export function AdminRidersPage() {
  const riders = useDeliveryStore((s) => s.riders)
  const jobs = useDeliveryStore((s) => s.jobs)

  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all')
  const [search, setSearch] = useState('')
  const [rejectingRider, setRejectingRider] = useState<RiderProfile | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const filteredRiders = useMemo(() => {
    return riders.filter((rider) => {
      if (tab !== 'all' && rider.status !== tab) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        rider.name.toLowerCase().includes(q) ||
        rider.phone.toLowerCase().includes(q) ||
        rider.serviceArea.toLowerCase().includes(q) ||
        rider.city.toLowerCase().includes(q) ||
        rider.vehicle.toLowerCase().includes(q)
      )
    })
  }, [riders, tab, search])

  const pendingCount = useMemo(() => riders.filter((r) => r.status === 'pending').length, [riders])

  const handleConfirmReject = () => {
    if (!rejectingRider || !rejectReason.trim()) return
    rejectRider(rejectingRider.id, rejectReason.trim())
    setRejectingRider(null)
    setRejectReason('')
  }

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="Delivery Partner Fleet"
        subtitle="Verify rider credentials, audit fleet availability, and manage service areas."
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search riders, phones, areas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={Search}
          />
        </div>

        <div className="flex w-full sm:w-auto rounded-xl border border-cream-3 bg-white p-1 text-xs">
          {(['all', 'pending', 'approved', 'suspended'] as const).map((key) => (
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
              {key}
              {key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[9px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Cards */}
      {filteredRiders.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="No Delivery Partners Found"
          description="Try adjusting your filter or search keywords."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRiders.map((rider) => {
            const isPending = rider.status === 'pending'
            const isSuspended = rider.status === 'suspended'
            const isApproved = rider.status === 'approved'

            const riderCompletedJobs = jobs.filter(
              (j) => j.riderId === rider.id && j.status === 'delivered',
            ).length

            return (
              <Card
                key={rider.id}
                className={`p-4 transition-shadow hover:shadow-soft flex flex-col justify-between ${
                  isPending ? 'border-orange-300 bg-orange-50/20' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-sm font-bold text-brown-900">{rider.name}</h3>
                        <Badge
                          tone={
                            isApproved
                              ? 'success'
                              : isPending
                                ? 'warning'
                                : isSuspended
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {rider.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-brown-600 mt-0.5">
                        <a href={`tel:${rider.phone}`} className="hover:underline">{rider.phone}</a> · {rider.city}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full border border-cream-4 bg-cream-2 px-2 py-0.5 text-[10px] font-semibold text-brown-700">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            rider.online ? 'bg-success' : 'bg-brown-300'
                          }`}
                        />
                        {rider.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-brown-600">
                    <div className="flex items-center gap-1.5 text-brown-500">
                      <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span>{rider.serviceArea} ({rider.pincode})</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-brown-400 pt-1">
                      <span className="capitalize font-medium text-brown-700">
                        Vehicle: {rider.vehicle}
                      </span>
                      <span>{riderCompletedJobs || rider.totalDeliveries} trips done</span>
                      <span className="flex items-center gap-1 text-warning-dark font-semibold">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {rider.rating || '4.8'}
                      </span>
                    </div>

                    {rider.collegeName && (
                      <div className="pt-1 text-[11px] text-brown-600 flex items-center gap-1.5">
                        <span className="font-semibold text-brown-700">College:</span>
                        <span>{rider.collegeName}</span>
                      </div>
                    )}

                    {rider.availabilityHours && (
                      <div className="text-[11px] text-brown-500 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-brown-400" />
                        <span>Hours: {rider.availabilityHours}</span>
                      </div>
                    )}

                    <div className="pt-1 text-[11px] text-brown-500 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-success" />
                        <span>KYC: {rider.idDocName || 'Student ID Card'}</span>
                      </div>
                      {rider.studentIdUrl && (
                        <a
                          href={rider.studentIdUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-orange-600 hover:underline text-[10px]"
                        >
                          View ID Card ↗
                        </a>
                      )}
                    </div>

                    {rider.rejectionReason && (
                      <p className="rounded-lg bg-danger-soft p-2 text-[10px] text-danger">
                        <span className="font-semibold">Rejection note: </span>{rider.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-cream-2 pt-3">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => {
                          setRejectingRider(rider)
                          setRejectReason('Invalid Driving License or background check.')
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => approveRider(rider.id)}
                        leftIcon={CheckCircle2}
                      >
                        Approve Rider
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-warning hover:bg-warning-soft"
                      onClick={() => setRiderSuspension(rider.id, true)}
                      leftIcon={Ban}
                    >
                      Suspend Fleet Access
                    </Button>
                  )}

                  {isSuspended && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setRiderSuspension(rider.id, false)}
                      leftIcon={RotateCcw}
                    >
                      Reinstate Partner
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        open={Boolean(rejectingRider)}
        onClose={() => setRejectingRider(null)}
        title={`Reject ${rejectingRider?.name}`}
        description="Provide a reason why this rider's application cannot be approved."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejectingRider(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-brown-700">Rejection Reason</label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full rounded-xl border border-cream-4 bg-white p-2.5 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-danger"
            placeholder="e.g. Incomplete ID document or vehicle details mismatch."
          />
        </div>
      </Modal>

      <DemoNote>Approved riders can immediately log in and accept jobs in their town.</DemoNote>
    </div>
  )
}
