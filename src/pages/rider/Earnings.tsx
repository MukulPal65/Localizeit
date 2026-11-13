import { useMemo } from 'react'
import {
  BadgeIndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  IndianRupee,
  Layers,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { useSettlementStore } from '@/store/settlements'
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { formatINR, isToday } from '@/utils'

export function RiderEarningsPage() {
  const riderId = useAuthStore((s) => s.riderId)
  const rider = useDeliveryStore((s) => s.riders.find((r) => r.id === riderId))
  const jobs = useDeliveryStore((s) => s.jobs)
  const settlements = useSettlementStore((s) => s.settlements)

  const myDeliveredJobs = useMemo(
    () => jobs.filter((j) => j.riderId === riderId && j.status === 'delivered'),
    [jobs, riderId],
  )

  const totalEarnings = useMemo(
    () => myDeliveredJobs.reduce((sum, j) => sum + j.payout, 0),
    [myDeliveredJobs],
  )

  const todayEarnings = useMemo(
    () =>
      myDeliveredJobs
        .filter((j) => j.deliveredAt && isToday(j.deliveredAt))
        .reduce((sum, j) => sum + j.payout, 0),
    [myDeliveredJobs],
  )

  const mySettlements = useMemo(
    () => settlements.filter((s) => s.party === 'rider' && (s.partyId === riderId || !riderId)),
    [settlements, riderId],
  )

  const pendingPayout = useMemo(
    () =>
      mySettlements
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + s.payout, 0),
    [mySettlements],
  )

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Rider Earnings & Payouts"
        subtitle="Track delivery remuneration, incentives, and bank settlements."
      />

      {/* Top Banner Stats */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-4 text-white shadow-soft">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-white/80">
          Total Completed Earnings
        </p>
        <h2 className="font-heading text-3xl font-bold mt-1">{formatINR(totalEarnings || 2436)}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/20 pt-3 text-xs">
          <div>
            <span className="text-white/70 text-[10px]">Today's Deliveries</span>
            <p className="font-heading text-base font-bold">{formatINR(todayEarnings)}</p>
          </div>
          <div>
            <span className="text-white/70 text-[10px]">Pending Bank Payout</span>
            <p className="font-heading text-base font-bold text-amber-100">{formatINR(pendingPayout || 2436)}</p>
          </div>
        </div>
      </div>

      {/* Rate Structure */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">
            Remuneration Scheme
          </h3>
          <span className="text-[10px] text-orange-600 font-semibold">Tier 2/3 Rate Card</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-cream-2 p-2.5">
            <p className="text-[10px] text-brown-400">Base Pay</p>
            <p className="font-heading text-sm font-bold text-brown-900">₹24</p>
            <p className="text-[9px] text-brown-400">per order</p>
          </div>
          <div className="rounded-xl bg-cream-2 p-2.5">
            <p className="text-[10px] text-brown-400">Distance</p>
            <p className="font-heading text-sm font-bold text-brown-900">₹3/km</p>
            <p className="text-[9px] text-brown-400">beyond shop</p>
          </div>
          <div className="rounded-xl bg-cream-2 p-2.5">
            <p className="text-[10px] text-brown-400">COD Fee</p>
            <p className="font-heading text-sm font-bold text-brown-900">+₹10</p>
            <p className="text-[9px] text-brown-400">per cash run</p>
          </div>
        </div>
      </Card>

      {/* Weekly Bank Settlements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">
            Bank Settlement History
          </h3>
          <span className="text-[10px] text-brown-400">Direct NEFT / UPI</span>
        </div>

        {mySettlements.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No Statements Yet"
            description="Weekly payout batches are finalized every Monday."
          />
        ) : (
          <div className="space-y-2.5">
            {mySettlements.map((settlement) => (
              <div
                key={settlement.id}
                className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-brown-900">
                      {settlement.period}
                    </span>
                    <Badge tone={settlement.status === 'paid' ? 'success' : 'warning'}>
                      {settlement.status === 'paid' ? 'Settled' : 'Processing'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-brown-400 mt-0.5">
                    Statement ID: {settlement.id}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-success">
                    {formatINR(settlement.payout)}
                  </span>
                  <p className="text-[10px] text-brown-400">
                    {settlement.status === 'paid' ? 'Transferred' : 'Next Batch'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DemoNote>Payouts are settled directly to the rider's linked bank account or UPI VPA.</DemoNote>
    </div>
  )
}
