import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  IndianRupee,
  ShieldAlert,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { recordCashHandover } from '@/services/supabaseService'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Stat } from '@/components/ui/primitives'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'
import { formatDateTime, formatINR, formatTime } from '@/utils'
import type { CodEntry } from '@/types'

export function RiderCodPage() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const riderId = useAuthStore((s) => s.riderId)
  const codEntries = useDeliveryStore((s) => s.codEntries)
  const jobs = useDeliveryStore((s) => s.jobs)

  // Handover modal state
  const [handoverModalEntry, setHandoverModalEntry] = useState<CodEntry | null>(null)
  const [handoverAmount, setHandoverAmount] = useState<number>(0)
  const [handoverNote, setHandoverNote] = useState('')

  // Filter entries that belong to this rider's completed jobs
  const myCodEntries = useMemo(() => {
    return codEntries.filter((entry) => {
      const job = jobs.find((j) => j.id === entry.jobId)
      return job ? job.riderId === riderId : true
    })
  }, [codEntries, jobs, riderId])

  const totalCollected = useMemo(
    () => myCodEntries.reduce((sum, e) => sum + e.amount, 0),
    [myCodEntries],
  )

  const pendingEntries = useMemo(
    () => myCodEntries.filter((e) => e.status === 'pending'),
    [myCodEntries],
  )

  const pendingHandover = useMemo(
    () => pendingEntries.reduce((sum, e) => sum + e.amount, 0),
    [pendingEntries],
  )

  const alreadyHandedOver = useMemo(
    () =>
      myCodEntries
        .filter((e) => e.status === 'handed_over' || e.status === 'discrepancy')
        .reduce((sum, e) => sum + (e.handedOverAmount ?? (e.status === 'handed_over' ? e.amount : 0)), 0),
    [myCodEntries],
  )

  const totalVariance = useMemo(
    () => myCodEntries.reduce((sum, e) => sum + (e.variance ?? 0), 0),
    [myCodEntries],
  )

  const displayedEntries = filter === 'pending' ? pendingEntries : myCodEntries

  const openHandover = (entry: CodEntry) => {
    setHandoverModalEntry(entry)
    setHandoverAmount(entry.amount)
    setHandoverNote('')
  }

  const submitHandover = () => {
    if (!handoverModalEntry) return
    recordCashHandover(handoverModalEntry.id, Number(handoverAmount), handoverNote)
    setHandoverModalEntry(null)
  }

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="COD Cash Management"
        subtitle="Track cash on delivery collections, record hub deposits, and reconcile variances."
      />

      {/* 5 Specific Required Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <Stat
          label="Total COD Collected"
          value={formatINR(totalCollected)}
          hint="From all completed deliveries"
          icon={Wallet}
          tone="neutral"
        />
        <Stat
          label="Pending Handover"
          value={formatINR(pendingHandover)}
          hint="Physical cash in hand"
          icon={Clock}
          tone="warning"
        />
        <Stat
          label="Already Handed Over"
          value={formatINR(alreadyHandedOver)}
          hint="Deposited at hub desk"
          icon={CheckCircle2}
          tone="success"
        />
        <Stat
          label="COD to Hand Over"
          value={formatINR(pendingHandover)}
          hint="Must deposit before shift end"
          icon={AlertCircle}
          tone="orange"
        />
        <Stat
          label="COD Variance"
          value={formatINR(Math.abs(totalVariance))}
          hint={totalVariance === 0 ? 'Balanced' : totalVariance > 0 ? 'Surplus' : 'Deficit (audit flagged)'}
          icon={AlertTriangle}
          tone={totalVariance === 0 ? 'success' : 'danger'}
        />
      </div>

      <InfoBanner
        title="Cash Deposit Rules"
        tone="info"
      >
        All customer cash collections must be deposited at the regional hub counter at the end of each shift. Discrepancies between expected cash and handed over cash are logged and audited.
      </InfoBanner>

      {/* Entries List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">
              Cash Transactions
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
              Pending Handover ({pendingEntries.length})
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
              All Records ({myCodEntries.length})
            </button>
          </div>
        </div>

        {displayedEntries.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={filter === 'pending' ? 'All Cash Handed Over' : 'No COD Transactions'}
            description={
              filter === 'pending'
                ? 'You have deposited all collected customer cash to the hub desk!'
                : 'No cash delivery collections recorded yet.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {displayedEntries.map((entry) => {
              const isPending = entry.status === 'pending'
              const isDiscrepancy = entry.status === 'discrepancy'

              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border p-3.5 shadow-xs space-y-2.5 bg-white ${
                    isDiscrepancy ? 'border-danger/40 bg-danger-soft/20' : 'border-cream-3'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-xs font-bold text-brown-900">
                          {entry.customerName}
                        </span>
                        <Badge
                          tone={
                            isPending
                              ? 'warning'
                              : isDiscrepancy
                                ? 'danger'
                                : 'success'
                          }
                        >
                          {isPending ? 'In Hand' : isDiscrepancy ? 'Discrepancy Flagged' : 'Settled'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-brown-500 mt-0.5">
                        Shop: <span className="font-medium text-brown-700">{entry.shopName}</span> · Ref: {entry.orderId}
                      </p>
                      <p className="text-[10px] text-brown-400">
                        Collected: {formatDateTime(entry.collectedAt)}
                      </p>
                      {entry.handedOverAt && (
                        <p className="text-[10px] text-brown-400">
                          Deposited: {formatDateTime(entry.handedOverAt)}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-heading text-sm font-bold text-brown-900">
                        {formatINR(entry.amount)}
                      </span>
                      {entry.handedOverAmount !== undefined && (
                        <p className="text-[10px] text-brown-500">
                          Deposited: {formatINR(entry.handedOverAmount)}
                        </p>
                      )}
                      {entry.variance !== undefined && entry.variance !== 0 && (
                        <p className="text-[10px] font-bold text-danger">
                          Diff: {formatINR(entry.variance)}
                        </p>
                      )}
                    </div>
                  </div>

                  {entry.discrepancyNote && (
                    <div className="rounded-lg bg-danger-soft p-2 text-[10px] text-danger flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{entry.discrepancyNote}</span>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center justify-between border-t border-cream-2 pt-2">
                      <span className="text-[10px] text-brown-400">Deposit at hub counter</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openHandover(entry)}
                        leftIcon={CheckCircle2}
                      >
                        Record Deposit
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Handover Modal */}
      <Modal
        open={Boolean(handoverModalEntry)}
        onClose={() => setHandoverModalEntry(null)}
        title="Record Cash Handover to Hub"
        description="Verify the physical cash being handed over to the supervisor."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setHandoverModalEntry(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={submitHandover}>
              Confirm Handover
            </Button>
          </>
        }
      >
        {handoverModalEntry && (
          <div className="space-y-3">
            <div className="rounded-xl bg-cream-2/60 p-3 text-xs space-y-1">
              <p className="flex justify-between">
                <span className="text-brown-500">Delivery Reference:</span>
                <span className="font-semibold text-brown-900">{handoverModalEntry.orderId}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-brown-500">Customer:</span>
                <span className="font-semibold text-brown-900">{handoverModalEntry.customerName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-brown-500">Expected Cash:</span>
                <span className="font-bold text-brown-900">{formatINR(handoverModalEntry.amount)}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">
                Actual Cash Handed Over (₹)
              </label>
              <input
                type="number"
                value={handoverAmount}
                onChange={(e) => setHandoverAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs font-bold text-brown-900"
              />
              {handoverAmount !== handoverModalEntry.amount && (
                <p className="mt-1 text-[11px] text-danger font-semibold">
                  Discrepancy detected: Diff of ₹{handoverAmount - handoverModalEntry.amount}. This will be flagged for supervisor audit.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">
                Notes / Handover Reference (optional)
              </label>
              <textarea
                rows={2}
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Supervisor initials, receipt number or explanation..."
                className="w-full rounded-xl border border-cream-4 bg-white p-2.5 text-xs text-brown-900"
              />
            </div>
          </div>
        )}
      </Modal>

      <DemoNote>Recorded deposits update the Super Admin settlement ledger in real-time.</DemoNote>
    </div>
  )
}
