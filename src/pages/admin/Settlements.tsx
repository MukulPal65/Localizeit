import { useState, useMemo } from 'react'
import {
  ArrowUpRight,
  BadgeIndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  IndianRupee,
  Layers,
  Search,
  Store,
  User,
  Wallet,
} from 'lucide-react'
import { useSettlementStore } from '@/store/settlements'
import { toast } from '@/store/toast'
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { formatINR, formatTime } from '@/utils'
import type { Settlement } from '@/types'

export function AdminSettlementsPage() {
  const settlements = useSettlementStore((s) => s.settlements)
  const markPaid = useSettlementStore((s) => s.markPaid)

  const [partyTab, setPartyTab] = useState<'all' | 'shop' | 'rider'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [search, setSearch] = useState('')

  const filteredSettlements = useMemo(() => {
    return settlements.filter((item) => {
      if (partyTab !== 'all' && item.party !== partyTab) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        item.id.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q) ||
        item.period.toLowerCase().includes(q)
      )
    })
  }, [settlements, partyTab, statusFilter, search])

  const pendingTotal = useMemo(
    () =>
      settlements
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + s.payout, 0),
    [settlements],
  )

  const paidTotal = useMemo(
    () =>
      settlements
        .filter((s) => s.status === 'paid')
        .reduce((sum, s) => sum + s.payout, 0),
    [settlements],
  )

  const totalCommission = useMemo(
    () => settlements.reduce((sum, s) => sum + s.commission, 0),
    [settlements],
  )

  const handlePay = (id: string, name: string) => {
    markPaid(id)
    toast('Payout Processed', `Transferred settlement to ${name} via demo NEFT.`, 'success')
  }

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="Settlement & Payout Ledger"
        subtitle="Reconcile merchant gross sales, platform commission retention, COD adjustments, and rider remuneration."
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="p-4 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brown-400">
            Pending Bank Payouts
          </span>
          <p className="font-heading text-2xl font-bold text-warning mt-1">
            {formatINR(pendingTotal)}
          </p>
          <p className="text-[10px] text-brown-400 mt-0.5">
            {settlements.filter((s) => s.status === 'pending').length} statements awaiting transfer
          </p>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brown-400">
            Completed Disbursements
          </span>
          <p className="font-heading text-2xl font-bold text-success mt-1">
            {formatINR(paidTotal)}
          </p>
          <p className="text-[10px] text-brown-400 mt-0.5">Disbursed to partner accounts</p>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brown-400">
            Retained Commission
          </span>
          <p className="font-heading text-2xl font-bold text-orange-600 mt-1">
            {formatINR(totalCommission)}
          </p>
          <p className="text-[10px] text-brown-400 mt-0.5">Net platform margin</p>
        </Card>
      </div>

      {/* Filters and Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search party, statement ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={Search}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Party Tabs */}
          <div className="flex rounded-xl border border-cream-3 bg-white p-1">
            {(['all', 'shop', 'rider'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPartyTab(key)}
                className={`rounded-lg px-3 py-1 font-semibold capitalize transition-all ${
                  partyTab === key
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-brown-500 hover:text-brown-800'
                }`}
              >
                {key === 'all' ? 'All Parties' : key === 'shop' ? 'Merchants' : 'Riders'}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-xl border border-cream-3 bg-white p-1">
            {(['all', 'pending', 'paid'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-lg px-2.5 py-1 font-semibold capitalize transition-all ${
                  statusFilter === key
                    ? 'bg-brown-900 text-white shadow-xs'
                    : 'text-brown-500 hover:text-brown-800'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      {filteredSettlements.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No Settlements Found"
          description="Adjust your search or filter options to review statements."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-cream-3 bg-cream-2 text-[10px] font-bold uppercase tracking-wider text-brown-500">
                <tr>
                  <th className="py-3 px-4">Statement & Party</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3 text-right">Gross Sales</th>
                  <th className="py-3 px-3 text-right">Commission</th>
                  <th className="py-3 px-3 text-right">COD Adjusted</th>
                  <th className="py-3 px-3 text-right">Net Payout</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-3 text-brown-800">
                {filteredSettlements.map((item) => {
                  const isPending = item.status === 'pending'

                  return (
                    <tr key={item.id} className="hover:bg-cream-1/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-brown-900">{item.partyName}</div>
                        <div className="text-[10px] text-brown-400">
                          {item.id} · <span className="capitalize">{item.party}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-brown-600">{item.period}</td>
                      <td className="py-3 px-3 text-right font-medium">
                        {item.grossSales > 0 ? formatINR(item.grossSales) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-brown-500">
                        {item.commission > 0 ? `-${formatINR(item.commission)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-warning font-medium">
                        {item.codCollected > 0 ? `-${formatINR(item.codCollected)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-heading font-bold text-success text-sm">
                        {formatINR(item.payout)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone={isPending ? 'warning' : 'success'}>
                          {isPending ? 'Pending' : 'Paid'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handlePay(item.id, item.partyName)}
                            leftIcon={CheckCircle2}
                          >
                            Disburse
                          </Button>
                        ) : (
                          <span className="text-[10px] text-brown-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <DemoNote>Disbursing a settlement simulates an automated bank transfer and logs the transaction.</DemoNote>
    </div>
  )
}
