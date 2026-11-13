import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BadgeIndianRupee,
  Bike,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  Navigation,
  Phone,
  Power,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { toast } from '@/store/toast'
import { acceptDeliveryJob } from '@/services/workflow'
import { Badge, Button, Card, EmptyState, Stat } from '@/components/ui/primitives'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'
import { cn, formatINR, isToday } from '@/utils'

export function RiderHomePage() {
  const riderId = useAuthStore((s) => s.riderId)
  const rider = useDeliveryStore((s) => s.riders.find((r) => r.id === riderId))
  const setOnline = useDeliveryStore((s) => s.setOnline)
  const jobs = useDeliveryStore((s) => s.jobs)
  const codEntries = useDeliveryStore((s) => s.codEntries)

  const isApproved = rider?.status === 'approved'
  const isPending = rider?.status === 'pending'
  const isSuspended = rider?.status === 'suspended'
  const isRejected = rider?.status === 'rejected'

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.riderId === riderId && ['accepted', 'picked_up'].includes(j.status)),
    [jobs, riderId],
  )

  const completedToday = useMemo(
    () =>
      jobs.filter(
        (j) => j.riderId === riderId && j.status === 'delivered' && j.deliveredAt && isToday(j.deliveredAt),
      ),
    [jobs, riderId],
  )

  const todayEarnings = useMemo(
    () => completedToday.reduce((sum, j) => sum + j.payout, 0),
    [completedToday],
  )

  const pendingCodTotal = useMemo(
    () =>
      codEntries
        .filter(
          (c) =>
            c.status === 'pending' &&
            jobs.some((j) => j.id === c.jobId && j.riderId === riderId),
        )
        .reduce((sum, c) => sum + c.amount, 0),
    [codEntries, jobs, riderId],
  )

  // Only approved riders can receive available requests
  const availableJobs = useMemo(
    () => (isApproved ? jobs.filter((j) => j.status === 'available') : []),
    [jobs, isApproved],
  )

  if (!rider) {
    return (
      <div className="py-8">
        <EmptyState
          icon={AlertCircle}
          title="Student Rider Profile Not Found"
          description="Register your student delivery profile or switch accounts from the role selector."
          action={
            <Link to="/rider/register">
              <Button size="sm">Register as Student Rider</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const handleToggleOnline = () => {
    if (!isApproved) {
      toast(
        'Approval Required',
        'Only verified student partners can go online or accept deliveries.',
        'warning',
      )
      return
    }
    const nextState = !rider.online
    setOnline(rider.id, nextState)
    toast(
      nextState ? 'You are now online!' : 'Shift ended (Offline)',
      nextState ? 'Ready to accept local delivery orders in your zone.' : 'You will not receive new deliveries.',
      nextState ? 'success' : 'info',
    )
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Account Verification Status Banners */}
      {isPending && (
        <InfoBanner
          title="Student Verification in Progress"
          tone="warning"
        >
          Your college ID and vehicle details are currently under review by the Platform Admin. You will be able to go online and accept delivery jobs once approved.
        </InfoBanner>
      )}

      {isSuspended && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-danger">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Account Suspended</p>
              <p className="text-[11px] text-danger/80">
                {rider.rejectionReason || 'Fleet access suspended by platform admin. Contact your hub supervisor.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-danger">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Application Rejected</p>
              <p className="text-[11px] text-danger/80">
                Reason: {rider.rejectionReason || 'Student ID or vehicle registration mismatch.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero card with online toggle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brown-900 to-brown-950 p-4 text-cream shadow-soft">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-cream/70">Student Partner,</span>
              <Badge tone={isApproved ? 'success' : isPending ? 'warning' : 'danger'}>
                {rider.status.toUpperCase()}
              </Badge>
            </div>
            <h1 className="mt-0.5 font-heading text-lg font-bold text-cream">{rider.name}</h1>
            <p className="mt-0.5 text-[11px] text-cream/60">
              {rider.collegeName || 'Student Partner'} · {rider.serviceArea} ({rider.vehicle.toUpperCase()})
            </p>
          </div>

          <button
            type="button"
            disabled={!isApproved}
            onClick={handleToggleOnline}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl p-2.5 transition-transform active:scale-95',
              rider.online ? 'bg-success/20 text-success' : 'bg-white/10 text-cream/60',
              !isApproved && 'opacity-40 cursor-not-allowed',
            )}
          >
            <Power className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {rider.online ? 'Online' : 'Offline'}
            </span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
          <div>
            <p className="text-[10px] text-cream/60">Today's Pay</p>
            <p className="font-heading text-sm font-bold text-orange-400">{formatINR(todayEarnings)}</p>
          </div>
          <div>
            <p className="text-[10px] text-cream/60">Delivered</p>
            <p className="font-heading text-sm font-bold text-cream">{completedToday.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-cream/60">Cash in Hand</p>
            <p className="font-heading text-sm font-bold text-warning">{formatINR(pendingCodTotal)}</p>
          </div>
        </div>
      </div>

      {/* Active Run Card if any */}
      {activeJobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500">Active Task in Progress</h2>
            <Link to="/rider/active" className="text-[11px] font-semibold text-orange-600 hover:underline">
              View active runs →
            </Link>
          </div>

          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border-2 border-orange-400 bg-orange-50/50 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Badge tone="orange">
                    {job.status === 'picked_up' ? 'In Transit to Buyer' : 'Heading to Merchant'}
                  </Badge>
                  <h3 className="mt-1 text-sm font-bold text-brown-900">{job.shopName}</h3>
                  <p className="text-xs text-brown-600">Drop: {job.customerName}</p>
                </div>
                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-orange-600">{formatINR(job.payout)}</span>
                  <p className="text-[10px] text-brown-400">{job.distanceKm} km</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-orange-200/60 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-brown-600">
                  <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {job.status === 'picked_up' ? job.dropAddress : job.pickupAddress}
                  </span>
                </div>
                <Link to={`/rider/active/${job.id}`}>
                  <Button size="sm" variant="primary">
                    Manage Run
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Delivery Requests */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500">Available Near You</h2>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">
              {availableJobs.length}
            </span>
          </div>
          <Link to="/rider/jobs" className="text-[11px] font-semibold text-orange-600 hover:underline">
            See all →
          </Link>
        </div>

        {!isApproved ? (
          <div className="rounded-xl border border-dashed border-cream-4 bg-white/40 p-5 text-center">
            <GraduationCap className="mx-auto h-6 w-6 text-orange-400" />
            <p className="mt-1 text-xs font-bold text-brown-800">Account Approval Required</p>
            <p className="text-[10px] text-brown-400">
              Available delivery requests are shown once platform administrators verify your student identity.
            </p>
          </div>
        ) : !rider.online ? (
          <div className="rounded-xl border border-dashed border-cream-4 bg-white/40 p-5 text-center">
            <Power className="mx-auto h-6 w-6 text-brown-300" />
            <p className="mt-1 text-xs font-bold text-brown-800">You Are Currently Offline</p>
            <p className="text-[10px] text-brown-400">
              Toggle 'Online' above when ready to receive nearby delivery jobs.
            </p>
          </div>
        ) : availableJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-cream-4 bg-white/40 p-5 text-center">
            <Clock className="mx-auto h-6 w-6 text-brown-300" />
            <p className="mt-1 text-xs font-medium text-brown-700">No pending delivery jobs right now</p>
            <p className="text-[10px] text-brown-400">
              New orders marked 'Ready' by local shops will pop up here instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {availableJobs.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                      Ref: {job.id}
                    </span>
                    <h3 className="text-xs font-bold text-brown-900">{job.shopName}</h3>
                    <p className="text-[11px] text-brown-500">Pickup: {job.pickupAddress}</p>
                    <p className="mt-1 text-[11px] font-medium text-brown-800">
                      Drop: <span className="text-brown-600">{job.dropAddress}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-heading text-sm font-bold text-success">{formatINR(job.payout)}</span>
                    <p className="text-[10px] text-brown-400">{job.distanceKm} km trip</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-cream-2 pt-2.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={job.codAmount > 0 ? 'warning' : 'neutral'}>
                      {job.codAmount > 0 ? `COD ${formatINR(job.codAmount)} Cash` : 'Prepaid (₹0 COD)'}
                    </Badge>
                    <span className="text-[10px] text-brown-400">{job.itemCount} items</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.pickupAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-brown-400 hover:text-orange-600 rounded-lg"
                      title="Open Navigation"
                    >
                      <Navigation className="h-4 w-4" />
                    </a>
                    <Button
                      size="sm"
                      onClick={() => acceptDeliveryJob(job.id, rider.id)}
                      leftIcon={Bike}
                    >
                      Accept (₹{job.payout})
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <Link
          to="/rider/cod"
          className="rounded-xl border border-cream-3 bg-white p-3 shadow-xs hover:border-orange-300 transition-colors"
        >
          <div className="flex items-center justify-between text-warning">
            <Wallet className="h-5 w-5" />
            <ArrowRight className="h-3.5 w-3.5 text-brown-300" />
          </div>
          <p className="mt-2 text-xs font-bold text-brown-900">COD Cash Ledger</p>
          <p className="text-[10px] text-brown-400">{formatINR(pendingCodTotal)} to deposit at hub</p>
        </Link>

        <Link
          to="/rider/earnings"
          className="rounded-xl border border-cream-3 bg-white p-3 shadow-xs hover:border-orange-300 transition-colors"
        >
          <div className="flex items-center justify-between text-orange-600">
            <BadgeIndianRupee className="h-5 w-5" />
            <ArrowRight className="h-3.5 w-3.5 text-brown-300" />
          </div>
          <p className="mt-2 text-xs font-bold text-brown-900">Earnings & Payouts</p>
          <p className="text-[10px] text-brown-400">Track trip payouts & history</p>
        </Link>
      </div>

      <DemoNote>Rider job actions dispatch live tracking status updates directly to buyers.</DemoNote>
    </div>
  )
}
