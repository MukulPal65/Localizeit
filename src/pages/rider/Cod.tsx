import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  IndianRupee,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { handOverCod } from '@/services/workflow'
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'
import { formatINR, formatTime } from '@/utils'

export function RiderCodPage() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const riderId = useAuthStore((s) => s.riderId)
  const codEntries = useDeliveryStore((s) => s.codEntries)
  const jobs = useDeliveryStore((s) => s.jobs)

  // Filter entries that belong to this rider's completed jobs
  const myCodEntries = useMemo(() => {
    return codEntries.filter((entry) => {
      const job = jobs.find((j) => j.id === entry.jobId)
      return job ? job.riderId === riderId : true
    })
  }, [codEntries, jobs, riderId])

  const pendingEntries = useMemo(
    () => myCodEntries.filter((e) => e.status === 'pending'),
    [myCodEntries],
  )

  const pendingAmount = useMemo(
    () => pendingEntries.reduce((sum, e) => sum + e.amount, 0),
    [pendingEntries],
  )

  const handedOverTotal = useMemo(
    () =>
      myCodEntries
        .filter((e) => e.status === 'handed_over')
        .reduce((sum, e) => sum + e.amount, 0),
    [myCodEntries],
  )

  const displayedEntries = filter === 'pending' ? pendingEntries : myCodEntries

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Cash on Delivery (COD)"
        subtitle="Manage physical cash collected from customers."
      />

      {/* Summary card */}
      <div className="rounded-2xl border border-warning/40 bg-gradient-to-br from-warning-soft via-cream to-cream-2 p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brown-500">
              Cash In Hand (To Deposit)
            </p>
            <p className="font-heading text-2xl font-bold text-brown-950 mt-1">
              {formatINR(pendingAmount)}
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/20 text-warning">
            <Wallet className="h-6 w-6" />
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-warning/20 pt-3 text-xs">
          <span className="text-brown-500">Total Deposited to Hub</span>
          <span className="font-heading font-bold text-brown-800">{formatINR(handedOverTotal)}</span>
        </div>
      </div>

      <InfoBanner
        title="Hub Deposit Protocol"
        tone="info"
      >
        Hand over cash at your town distribution hub or to the supervisor at the end of each day.
      </InfoBanner>

      {/* Entries List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">
              Collected Payments
            </h3>
            <span className="rounded-full bg-cream-3 px-1.5 py-0.5 text-[10px] font-semibold text-brown-700">
              {displayedEntries.length}
            </span>
          </div>

          <div className="flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                filter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-brown-600 hover:bg-cream-2'
              }`}
            >
              Pending ({pendingEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-brown-600 hover:bg-cream-2'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {displayedEntries.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={filter === 'pending' ? 'All Cash Handed Over' : 'No COD Transactions'}
            description={
              filter === 'pending'
                ? 'You have zero pending cash to hand over to the hub!'
                : 'No cash collections recorded yet.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {displayedEntries.map((entry) => {
              const isPending = entry.status === 'pending'

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading text-xs font-bold text-brown-900">
                          {entry.customerName}
                        </span>
                        <Badge tone={isPending ? 'warning' : 'success'}>
                          {isPending ? 'In Hand' : 'Deposited'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-brown-500">Shop: {entry.shopName}</p>
                      <p className="text-[10px] text-brown-400">
                        Collected at {formatTime(entry.collectedAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-heading text-sm font-bold text-brown-900">
                        {formatINR(entry.amount)}
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex items-center justify-between border-t border-cream-2 pt-2">
                      <span className="text-[10px] text-brown-400">Deposit at hub counter</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handOverCod(entry.id)}
                        leftIcon={CheckCircle2}
                      >
                        Confirm Handover
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DemoNote>Handing over cash records an audit entry and updates the admin settlements ledger.</DemoNote>
    </div>
  )
}
