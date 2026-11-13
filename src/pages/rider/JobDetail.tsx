import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  IndianRupee,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { acceptDeliveryJob, pickupDeliveryJob, completeDeliveryJob } from '@/services/workflow'
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { RouteMap } from '@/components/shared/RouteMap'
import { formatINR, formatTime } from '@/utils'

export function RiderJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const riderId = useAuthStore((s) => s.riderId)
  const job = useDeliveryStore((s) => s.jobs.find((j) => j.id === jobId))

  if (!job) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Clock}
          title="Job Not Found"
          description={`Delivery job ${jobId} was not found.`}
          action={
            <Link to="/rider/jobs">
              <Button size="sm">Back to Jobs</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const isAssignedToMe = job.riderId === riderId

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-1.5 text-brown-500 hover:bg-cream-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-base font-bold text-brown-900">Task {job.id}</h1>
          <p className="text-[11px] text-brown-500">Order ID: {job.orderId}</p>
        </div>
      </div>

      {/* Payout & Status header */}
      <Card className="flex items-center justify-between p-4 bg-orange-50/40 border-orange-200">
        <div>
          <Badge
            tone={
              job.status === 'delivered'
                ? 'success'
                : job.status === 'picked_up'
                  ? 'orange'
                  : 'neutral'
            }
          >
            {job.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <p className="mt-1 text-xs text-brown-500">{job.distanceKm} km total route</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-brown-400">Rider Payout</p>
          <span className="font-heading text-xl font-bold text-success">{formatINR(job.payout)}</span>
        </div>
      </Card>

      {/* Route card */}
      <Card className="p-4 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brown-400">Route Details</h2>
        <RouteMap
          points={[
            { latitude: 27.1767, longitude: 78.0081 },
            { latitude: 27.1887, longitude: 78.0171 },
          ]}
          riderProgress={job.status === 'delivered' ? 1 : job.status === 'picked_up' ? 0.65 : 0}
        />

        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-orange-100 p-2 text-orange-600 shrink-0">
            <Store className="h-4 w-4" />
          </div>
          <div className="text-xs flex-1">
            <p className="font-bold text-brown-900">{job.shopName}</p>
            <p className="text-brown-600">{job.pickupAddress}</p>
            <div className="mt-1.5 rounded-lg bg-cream-2 p-2 text-[11px] text-brown-600">
              <span className="font-semibold text-brown-900">Note: </span>
              {job.pickupNote}
            </div>
          </div>
        </div>

        <div className="border-l-2 border-dashed border-cream-4 ml-5 h-4" />

        {/* Drop */}
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-info/10 p-2 text-info shrink-0">
            <Navigation className="h-4 w-4" />
          </div>
          <div className="text-xs flex-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-brown-900">{job.customerName}</p>
              <a
                href={`tel:${job.customerPhone}`}
                className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            </div>
            <p className="text-brown-600">{job.dropAddress}</p>
            {job.dropNote && (
              <div className="mt-1.5 rounded-lg bg-cream-2 p-2 text-[11px] text-brown-600">
                <span className="font-semibold text-brown-900">Landmark: </span>
                {job.dropNote}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* COD payment if applicable */}
      {job.codAmount > 0 && (
        <Card className="p-4 border-warning/40 bg-warning-soft/40 space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xs font-bold text-brown-900">Cash Collection Required</p>
              <p className="text-[11px] text-brown-600">
                Collect exactly <span className="font-bold">{formatINR(job.codAmount)}</span> from the buyer.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Workflow action buttons */}
      <div className="pt-2">
        {job.status === 'available' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              if (riderId) acceptDeliveryJob(job.id, riderId)
            }}
            leftIcon={Bike}
          >
            Accept This Job ({formatINR(job.payout)})
          </Button>
        )}

        {job.status === 'accepted' && isAssignedToMe && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => pickupDeliveryJob(job.id)}
            leftIcon={CheckCircle2}
          >
            Confirm Picked Up From Merchant
          </Button>
        )}

        {job.status === 'picked_up' && isAssignedToMe && (
          <Button
            size="lg"
            variant="primary"
            className="w-full"
            onClick={() => {
              completeDeliveryJob(job.id)
              navigate('/rider/active')
            }}
            leftIcon={ShieldCheck}
          >
            Mark Order Delivered ({formatINR(job.payout)})
          </Button>
        )}

        {job.status === 'delivered' && (
          <div className="rounded-xl border border-success/30 bg-success-soft p-3.5 text-center text-xs font-semibold text-success">
            ✓ Order was successfully delivered
          </div>
        )}
      </div>

      <DemoNote>Live status synchronization informs both merchant and buyer in real-time.</DemoNote>
    </div>
  )
}
