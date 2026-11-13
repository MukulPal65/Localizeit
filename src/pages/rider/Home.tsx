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

  const availableJobs = useMemo(
    () => jobs.filter((j) => j.status === 'available'),
    [jobs],
  )

  if (!rider) {
    return (
      <div className="py-8">
        <EmptyState
          icon={AlertCircle}
          title="Rider Profile Not Found"
          description="Please select a rider account or register a new delivery profile."
          action={
            <Link to="/rider/register">
              <Button size="sm">Register as Rider</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const isPending = rider.status === 'pending'
  const isSuspended = rider.status === 'suspended'

  return (
    <div className="space-y-4 pb-6">
      {/* Verification notice if not approved */}
      {isPending && (
        <InfoBanner
          title="Verification in Progress"
          tone="warning"
        >
          Your application is under mock review by the hub manager. You can still test job flows in demo mode.
        </InfoBanner>
      )}

      {isSuspended && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-danger">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Account Suspended</p>
              <p className="text-[11px] text-danger/80">{rider.rejectionReason || 'Contact local hub supervisor.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero card with online toggle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brown-900 to-brown-950 p-4 text-cream shadow-soft">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-cream/70">Welcome back,</span>
              <Badge tone={rider.status === 'approved' ? 'success' : 'warning'}>
                {rider.status}
              </Badge>
            </div>
            <h1 className="mt-0.5 font-heading text-lg font-bold text-cream">{rider.name}</h1>
            <p className="mt-0.5 text-[11px] text-cream/60">
              {rider.serviceArea} · {rider.vehicle.toUpperCase()}
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setOnline(rider.id, !rider.online)
              toast(
                rider.online ? 'Shift ended' : 'You are now online',
                rider.online ? 'You will not receive new deliveries.' : 'Ready to accept nearby orders!',
                rider.online ? 'info' : 'success',
              )
            }}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl p-2.5 transition-transform active:scale-95',
              rider.online ? 'bg-success/20 text-success' : 'bg-white/10 text-cream/60',
              isPending && 'opacity-50 cursor-not-allowed',
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500">Active Task</h2>
            <Link to="/rider/active" className="text-[11px] font-semibold text-orange-600 hover:underline">
              View details →
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
                    {job.status === 'picked_up' ? 'In Transit to Drop' : 'Heading to Pickup'}
                  </Badge>
                  <h3 className="mt-1 text-sm font-bold text-brown-900">{job.shopName}</h3>
                  <p className="text-xs text-brown-600">→ {job.customerName}</p>
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
                    Manage
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Jobs Pool */}
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

        {availableJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-cream-4 bg-white/40 p-5 text-center">
            <Clock className="mx-auto h-6 w-6 text-brown-300" />
            <p className="mt-1 text-xs font-medium text-brown-700">No pending delivery jobs right now</p>
            <p className="text-[10px] text-brown-400">
              New orders marked "Ready" by local shops will pop up here instantly.
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
                    <h3 className="text-xs font-bold text-brown-900">{job.shopName}</h3>
                    <p className="text-[11px] text-brown-500">{job.pickupAddress}</p>
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
                      {job.codAmount > 0 ? `COD ${formatINR(job.codAmount)}` : 'Prepaid'}
                    </Badge>
                    <span className="text-[10px] text-brown-400">{job.itemCount} items</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => acceptDeliveryJob(job.id, rider.id)}
                    leftIcon={Bike}
                  >
                    Accept (₹{job.payout})
                  </Button>
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
          <p className="text-[10px] text-brown-400">{formatINR(pendingCodTotal)} pending handover</p>
        </Link>

        <Link
          to="/rider/earnings"
          className="rounded-xl border border-cream-3 bg-white p-3 shadow-xs hover:border-orange-300 transition-colors"
        >
          <div className="flex items-center justify-between text-orange-600">
            <BadgeIndianRupee className="h-5 w-5" />
            <ArrowRight className="h-3.5 w-3.5 text-brown-300" />
          </div>
          <p className="mt-2 text-xs font-bold text-brown-900">Payout Summary</p>
          <p className="text-[10px] text-brown-400">Track incentives & bank dues</p>
        </Link>
      </div>

      <DemoNote>Rider actions update live buyer tracking and shop order states automatically.</DemoNote>
    </div>
  )
}
