import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeIndianRupee,
  Banknote,
  Download,
  FileText,
  Landmark,
  Percent,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { Settlement } from '@/types'
import { shopOrderRevenue } from '@/services/orderService'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { useOrderStore } from '@/store/orders'
import { useSettlementStore } from '@/store/settlements'
import { toast } from '@/store/toast'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Stat, Tabs } from '@/components/ui/primitives'
import { BarChart } from '@/components/ui/charts'
import { DemoNote, InfoBanner, KeyValue, TableWrap, tdClass, thClass } from '@/components/shared/dashboard'
import { cn, downloadCsv, formatDate, formatDateTime, formatINR } from '@/utils'

type Period = '7' | '30' | 'all'

export function ShopSalesPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shop = useCatalogStore((s) => s.shops.find((item) => item.id === shopId))
  const orders = useOrderStore((s) => s.orders)
  const settlements = useSettlementStore((s) => s.settlements)
  const [period, setPeriod] = useState<Period>('30')
  const [detail, setDetail] = useState<Settlement | null>(null)

  const mySettlements = useMemo(
    () => settlements.filter((item) => item.party === 'shop' && item.partyId === shopId),
    [settlements, shopId],
  )
  const pendingPayout = mySettlements
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.payout, 0)
  const paidPayout = mySettlements
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + item.payout, 0)

  const revenue = useMemo(() => shopOrderRevenue(orders, shopId), [orders, shopId])

  const deliveredRows = useMemo(
    () =>
      orders
        .flatMap((order) =>
          order.shopOrders
            .filter((shopOrder) => shopOrder.shopId === shopId && shopOrder.status === 'delivered')
            .map((shopOrder) => ({ order, shopOrder })),
        )
        .sort((a, b) =>
          (b.shopOrder.statusHistory.at(-1)?.at ?? b.order.createdAt).localeCompare(
            a.shopOrder.statusHistory.at(-1)?.at ?? a.order.createdAt,
          ),
        ),
    [orders, shopId],
  )

  const filteredRows = useMemo(() => {
    if (period === 'all') return deliveredRows
    const days = Number(period)
    const cutoff = Date.now() - days * 86_400_000
    return deliveredRows.filter(
      (row) => new Date(row.shopOrder.statusHistory.at(-1)?.at ?? row.order.createdAt).getTime() >= cutoff,
    )
  }, [deliveredRows, period])

  const gross = filteredRows.reduce((sum, row) => sum + row.shopOrder.subtotal, 0)
  const delivery = filteredRows.reduce((sum, row) => sum + row.shopOrder.deliveryFee, 0)
  const commissionPct = shop?.commissionPct ?? 5
  const commission = Math.round((gross * commissionPct) / 100)
  const net = gross - commission

  const trend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      return date
    })
    return days.map((date) => {
      const value = deliveredRows
        .filter((row) => {
          const at = new Date(row.shopOrder.statusHistory.at(-1)?.at ?? row.order.createdAt)
          return (
            at.getDate() === date.getDate() &&
            at.getMonth() === date.getMonth() &&
            at.getFullYear() === date.getFullYear()
          )
        })
        .reduce((sum, row) => sum + row.shopOrder.subtotal, 0)
      return { label: date.toLocaleDateString('en-IN', { weekday: 'short' }), value }
    })
  }, [deliveredRows])

  const downloadStatement = (settlement: Settlement) => {
    downloadCsv(`${settlement.id}-statement.csv`, [
      {
        statement: settlement.id,
        party: settlement.partyName,
        period: settlement.period,
        grossSales: settlement.grossSales,
        commission: settlement.commission,
        refunds: settlement.refunds,
        codCollected: settlement.codCollected,
        payout: settlement.payout,
        status: settlement.status,
        paidAt: settlement.paidAt ?? '',
      },
    ])
    toast('Statement downloaded', `${settlement.id} · ${settlement.period}`, 'success')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales & payouts"
        subtitle="Delivered orders, platform commission and demo settlement statements for your shop."
        action={
          <Badge tone="neutral">
            <Percent className="h-2.5 w-2.5" /> {commissionPct}% commission
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Item sales" value={formatINR(gross)} hint={`${filteredRows.length} delivered orders`} icon={TrendingUp} tone="orange" />
        <Stat label="Delivery collected" value={formatINR(delivery)} hint="Paid by buyers" icon={Banknote} tone="info" />
        <Stat label="Platform commission" value={formatINR(commission)} hint={`${commissionPct}% of item sales`} icon={Percent} tone="warning" />
        <Stat label="Pending payout" value={formatINR(pendingPayout)} hint={`${formatINR(paidPayout)} already paid`} icon={Wallet} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">Sales trend</h2>
                <p className="text-[11px] text-brown-400">Item sales from delivered shop orders, last 7 days.</p>
              </div>
              <Tabs
                value={period}
                onChange={(value) => setPeriod(value as Period)}
                items={[
                  { id: '7', label: '7 days' },
                  { id: '30', label: '30 days' },
                  { id: 'all', label: 'All time' },
                ]}
                className="mx-0"
              />
            </div>
            <BarChart data={trend} height={160} format={(value) => formatINR(value)} />
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-cream-3 pt-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-brown-400">Delivered</p>
                <p className="text-sm font-semibold text-brown-900">{filteredRows.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-brown-400">Avg order</p>
                <p className="text-sm font-semibold text-brown-900">
                  {formatINR(filteredRows.length ? Math.round(gross / filteredRows.length) : 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-brown-400">Net after fee</p>
                <p className="text-sm font-semibold text-success">{formatINR(net)}</p>
              </div>
              <div>
                <p className="text-[10px] text-brown-400">All-time sales</p>
                <p className="text-sm font-semibold text-brown-900">{formatINR(revenue.gross)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-3 px-4 py-3">
              <div>
                <h2 className="font-heading text-sm font-semibold text-brown-900">Delivered orders</h2>
                <p className="text-[10px] text-brown-400">Completed shop packets in the selected period.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Download}
                disabled={!filteredRows.length}
                onClick={() => {
                  downloadCsv(
                    `${shop?.name ?? 'shop'}-sales.csv`,
                    filteredRows.map((row) => ({
                      order: row.order.id,
                      buyer: row.order.buyerName,
                      deliveredAt: row.shopOrder.statusHistory.at(-1)?.at ?? '',
                      subtotal: row.shopOrder.subtotal,
                      deliveryFee: row.shopOrder.deliveryFee,
                      payment: row.shopOrder.paymentMethod,
                      items: row.shopOrder.items.map((item) => `${item.name} x${item.qty}`).join(' | '),
                    })),
                  )
                  toast('Sales CSV exported', `${filteredRows.length} delivered orders.`, 'success')
                }}
              >
                Export sales
              </Button>
            </div>
            {filteredRows.length === 0 ? (
              <EmptyState
                icon={BadgeIndianRupee}
                title="No delivered orders in this period"
                description="Move an order through ready → delivered, or switch the period to all time."
              />
            ) : (
              <TableWrap className="rounded-none border-0 shadow-none" minWidth="min-w-[620px]">
                <thead>
                  <tr>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>Buyer</th>
                    <th className={thClass}>Items</th>
                    <th className={thClass}>Payment</th>
                    <th className={thClass}>Subtotal</th>
                    <th className={cn(thClass, 'text-right')}>Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 12).map((row) => (
                    <tr key={row.shopOrder.id}>
                      <td className={tdClass}>
                        <span className="font-medium text-brown-800">{row.order.id}</span>
                      </td>
                      <td className={tdClass}>{row.order.buyerName}</td>
                      <td className={tdClass}>
                        <span className="line-clamp-1 text-[10px] text-brown-400">
                          {row.shopOrder.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <Badge tone={row.shopOrder.paymentMethod === 'cod' ? 'warning' : 'neutral'}>
                          {row.shopOrder.paymentMethod === 'cod' ? 'COD' : 'UPI'}
                        </Badge>
                      </td>
                      <td className={tdClass}>{formatINR(row.shopOrder.subtotal)}</td>
                      <td className={cn(tdClass, 'text-right text-[10px] text-brown-400')}>
                        {formatDate(row.shopOrder.statusHistory.at(-1)?.at ?? row.order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brown-900">Payout account</h2>
              <Badge tone="success">Verified · demo</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-cream-3 bg-cream-2/40 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brown-500">
                <Landmark className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-brown-900">State Bank of India</p>
                <p className="text-[10px] text-brown-400">A/C •••• 4821 · IFSC SBIN0001234</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <KeyValue label="Settlement cycle">Weekly · Monday</KeyValue>
              <KeyValue label="Commission">{commissionPct}% of item sales</KeyValue>
              <KeyValue label="COD handling">Rider remits to admin</KeyValue>
              <KeyValue label="Last paid">{mySettlements.find((item) => item.status === 'paid')?.period ?? '—'}</KeyValue>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              leftIcon={FileText}
              onClick={() => toast('Payout details are demo', 'A real bank change needs re-verification. No change was saved.', 'info')}
            >
              Request account change
            </Button>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brown-900">Settlement statements</h2>
              <Badge tone="neutral">{mySettlements.length}</Badge>
            </div>
            {mySettlements.length === 0 ? (
              <p className="py-4 text-[11px] leading-relaxed text-brown-400">
                Statements appear after the demo admin runs a settlement cycle.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {mySettlements.map((settlement) => (
                  <button
                    key={settlement.id}
                    type="button"
                    onClick={() => setDetail(settlement)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-cream-3 bg-white/70 p-2.5 text-left transition-colors hover:border-orange-200"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-brown-800">{settlement.period}</p>
                      <p className="text-[9.5px] text-brown-400">{settlement.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-brown-900">{formatINR(settlement.payout)}</p>
                      <Badge tone={settlement.status === 'paid' ? 'success' : 'warning'}>{settlement.status}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Link to="/shop/orders" className="mt-3 flex items-center gap-1 text-[10px] font-medium text-orange-600">
              View order history <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>

          <InfoBanner tone="info" title="How the demo payout works">
            Payout = item sales − platform commission + COD collected. The admin Settlements screen can mark a
            statement paid; it appears here instantly.
          </InfoBanner>

          <DemoNote>No real bank transfer is initiated. Statements use seeded demo amounts.</DemoNote>
        </div>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Statement ${detail.id}` : 'Statement'}
        description={detail ? `${detail.period} · ${detail.partyName}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button
              size="sm"
              leftIcon={Download}
              onClick={() => {
                if (detail) downloadStatement(detail)
              }}
            >
              Download CSV
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-2">
            <KeyValue label="Gross sales">{formatINR(detail.grossSales)}</KeyValue>
            <KeyValue label="Commission">− {formatINR(detail.commission)}</KeyValue>
            <KeyValue label="Refunds">− {formatINR(detail.refunds)}</KeyValue>
            <KeyValue label="COD collected">{formatINR(detail.codCollected)}</KeyValue>
            <div className="border-t border-dashed border-cream-4 pt-2">
              <KeyValue label="Net payout">
                <span className="font-heading text-base font-semibold text-brown-900">{formatINR(detail.payout)}</span>
              </KeyValue>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-cream-2/60 px-2.5 py-2 text-[10px] text-brown-500">
              <span>Status</span>
              <Badge tone={detail.status === 'paid' ? 'success' : 'warning'}>{detail.status}</Badge>
            </div>
            {detail.paidAt && (
              <p className="text-[10px] text-brown-400">Marked paid {formatDateTime(detail.paidAt)}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
