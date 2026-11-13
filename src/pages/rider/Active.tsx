import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { pickupDeliveryJob, completeDeliveryJob } from '@/services/workflow'
import { Badge, Button, EmptyState, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { RouteMap } from '@/components/shared/RouteMap'
import { cn, formatINR } from '@/utils'

export function RiderActivePage() {
  const riderId = useAuthStore((s) => s.riderId)
  const jobs = useDeliveryStore((s) => s.jobs)

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.riderId === riderId && ['accepted', 'picked_up'].includes(j.status)),
    [jobs, riderId],
  )

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Active Runs"
        subtitle="Manage live pickups and drop-offs assigned to you."
      />

      {activeJobs.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="No Active Deliveries"
          description="You don't have any orders in progress right now. Visit the Jobs tab to pick up new delivery orders."
          action={
            <Link to="/rider/jobs">
              <Button size="sm">Browse Available Jobs</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {activeJobs.map((job) => {
            const isPickedUp = job.status === 'picked_up'

            return (
              <div
                key={job.id}
                className="overflow-hidden rounded-2xl border-2 border-orange-400 bg-white shadow-soft"
              >
                {/* Header status bar */}
                <div className="flex items-center justify-between bg-orange-500 px-4 py-2 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isPickedUp ? 'In Transit to Customer' : 'Assigned — Heading to Shop'}
                  </span>
                  <span className="font-heading text-xs font-bold">{job.id}</span>
                </div>

                <div className="p-4 space-y-4">
                  <RouteMap
                    points={[
                      { latitude: 27.1767, longitude: 78.0081 },
                      { latitude: 27.1887, longitude: 78.0171 },
                    ]}
                    riderProgress={isPickedUp ? 0.65 : 0}
                  />
                  {/* Step visual indicator */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-brown-900">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                          isPickedUp ? 'bg-success text-white' : 'bg-orange-500 text-white',
                        )}
                      >
                        {isPickedUp ? '✓' : '1'}
                      </span>
                      <span>Shop Pickup</span>
                    </div>

                    <div className={cn('h-0.5 flex-1 mx-2', isPickedUp ? 'bg-success' : 'bg-cream-4')} />

                    <div
                      className={cn(
                        'flex items-center gap-1.5 font-bold',
                        isPickedUp ? 'text-brown-900' : 'text-brown-400',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                          isPickedUp ? 'bg-orange-500 text-white' : 'bg-cream-3 text-brown-400',
                        )}
                      >
                        2
                      </span>
                      <span>Customer Drop</span>
                    </div>
                  </div>

                  {/* Current Active Step Details */}
                  {!isPickedUp ? (
                    /* Step 1: Pickup from Shop */
                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge tone="orange">Step 1: Go to Merchant</Badge>
                          <h4 className="mt-1 font-heading text-sm font-bold text-brown-900">
                            {job.shopName}
                          </h4>
                          <p className="text-xs text-brown-600">{job.pickupAddress}</p>
                        </div>
                        <span className="rounded-lg bg-orange-100 p-2 text-orange-600">
                          <Store className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="rounded-lg bg-white/80 p-2 text-[11px] text-brown-700">
                        <span className="font-semibold text-brown-900">Pickup Note: </span>
                        {job.pickupNote}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.pickupAddress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                        >
                          <Navigation className="h-3 w-3" /> Map to Shop
                        </a>
                        <Button
                          size="sm"
                          onClick={() => pickupDeliveryJob(job.id)}
                          leftIcon={CheckCircle2}
                        >
                          Confirm Package Picked Up
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Drop at Customer */
                    <div className="rounded-xl border border-success/30 bg-success-soft/30 p-3.5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge tone="success">Step 2: Deliver to Customer</Badge>
                          <h4 className="mt-1 font-heading text-sm font-bold text-brown-900">
                            {job.customerName}
                          </h4>
                          <p className="text-xs text-brown-600">{job.dropAddress}</p>
                        </div>
                        <a
                          href={`tel:${job.customerPhone}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-white shadow-xs"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      </div>

                      {job.dropNote && (
                        <div className="rounded-lg bg-white/80 p-2 text-[11px] text-brown-700">
                          <span className="font-semibold text-brown-900">Delivery Instructions: </span>
                          {job.dropNote}
                        </div>
                      )}

                      {/* Cash collection alert if COD */}
                      {job.codAmount > 0 && (
                        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-brown-900">
                          <Wallet className="h-5 w-5 text-warning shrink-0" />
                          <div className="text-xs">
                            <p className="font-bold">Collect Cash on Delivery</p>
                            <p className="text-brown-600">
                              Collect <span className="font-bold text-warning-dark">{formatINR(job.codAmount)}</span> in cash from the customer.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.dropAddress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                        >
                          <Navigation className="h-3 w-3" /> Map to Buyer
                        </a>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => completeDeliveryJob(job.id)}
                          leftIcon={ShieldCheck}
                        >
                          Confirm Delivered
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-cream-2 pt-2 text-xs text-brown-500">
                    <Link
                      to={`/rider/active/${job.id}`}
                      className="font-medium text-orange-600 hover:underline flex items-center gap-1"
                    >
                      View full manifest & order info <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DemoNote>Marking 'Delivered' automatically credits your earnings and transfers COD amounts into your cash ledger.</DemoNote>
    </div>
  )
}
