import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bike,
  CheckCircle2,
  ClipboardList,
  FileBarChart2,
  IndianRupee,
  Layers,
  MapPin,
  Percent,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useCatalogStore } from '@/store/catalog'
import { useDeliveryStore } from '@/store/delivery'
import { useOrderStore } from '@/store/orders'
import { useActivityStore } from '@/store/activity'
import { useFeeStore } from '@/store/fees'
import { useSettlementStore } from '@/store/settlements'
import { calculateAdminMetrics } from '@/services/supabaseService'
import { Badge, Button, Card, EmptyState, PageHeader, Stat } from '@/components/ui/primitives'
import { BarChart, DonutChart, LineChart } from '@/components/ui/charts'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'
import { areaPerformance, categorySplit, gmvTrend, orderStatusSplit } from '@/data/admin'
import { formatINR, formatTime } from '@/utils'

export function AdminOverviewPage() {
  const shops = useCatalogStore((s) => s.shops)
  const products = useCatalogStore((s) => s.products)
  const riders = useDeliveryStore((s) => s.riders)
  const jobs = useDeliveryStore((s) => s.jobs)
  const orders = useOrderStore((s) => s.orders)
  const activity = useActivityStore((s) => s.entries)
  const settlements = useSettlementStore((s) => s.settlements)
  const feeConfig = useFeeStore((s) => s.config)

  const pendingShops = useMemo(() => shops.filter((s) => s.status === 'pending'), [shops])
  const pendingRiders = useMemo(() => riders.filter((r) => r.status === 'pending'), [riders])
  const unassignedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'available' && !j.riderId),
    [jobs],
  )

  const totalGmv = useMemo(
    () => orders.reduce((sum, o) => sum + o.breakdown.grandTotal, 0) + 168900,
    [orders],
  )

  const pendingSettlementsCount = useMemo(
    () => settlements.filter((s) => s.status === 'pending').length,
    [settlements],
  )

  const adminMetrics = useMemo(() => calculateAdminMetrics(), [shops, riders, jobs, orders])

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="LocalizeIt Platform Cockpit"
        subtitle="Super Admin control center for regional commerce hubs, merchant compliance, and rider fleets."
      />

      {/* Action required alerts */}
      {(pendingShops.length > 0 || pendingRiders.length > 0 || unassignedJobs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingShops.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning-soft p-3">
              <div className="flex items-center gap-2.5">
                <Store className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="text-xs font-bold text-brown-950">
                    {pendingShops.length} Merchant Application{pendingShops.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-brown-600">Pending identity & catalog review</p>
                </div>
              </div>
              <Link to="/admin/shops">
                <Button size="sm" variant="primary">Review</Button>
              </Link>
            </div>
          )}

          {pendingRiders.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-orange-300 bg-orange-50 p-3">
              <div className="flex items-center gap-2.5">
                <Bike className="h-5 w-5 text-orange-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-brown-950">
                    {pendingRiders.length} Rider Verification{pendingRiders.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-brown-600">Document verification required</p>
                </div>
              </div>
              <Link to="/admin/riders">
                <Button size="sm" variant="primary">Verify</Button>
              </Link>
            </div>
          )}

          {unassignedJobs.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger-soft p-3">
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-danger shrink-0" />
                <div>
                  <p className="text-xs font-bold text-brown-950">
                    {unassignedJobs.length} Unassigned Deliver{unassignedJobs.length > 1 ? 'ies' : 'y'}
                  </p>
                  <p className="text-[10px] text-brown-600">Needs manual fleet dispatch</p>
                </div>
              </div>
              <Link to="/admin/deliveries">
                <Button size="sm" variant="danger">Dispatch</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-white shadow-xs">
          <div className="flex items-center justify-between text-brown-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Merchandise (GMV)</span>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <p className="font-heading text-2xl font-bold text-brown-900 mt-2">{formatINR(totalGmv)}</p>
          <p className="text-[10px] text-success mt-1 font-semibold flex items-center gap-1">
            ↑ 18.4% vs last week
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-xs">
          <div className="flex items-center justify-between text-brown-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Merchants</span>
            <Store className="h-4 w-4 text-orange-500" />
          </div>
          <p className="font-heading text-2xl font-bold text-brown-900 mt-2">
            {shops.filter((s) => s.status === 'approved').length}
          </p>
          <p className="text-[10px] text-brown-400 mt-1">
            {shops.length} total registered in cluster
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-xs">
          <div className="flex items-center justify-between text-brown-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Delivery Fleet</span>
            <Bike className="h-4 w-4 text-info" />
          </div>
          <p className="font-heading text-2xl font-bold text-brown-900 mt-2">
            {riders.filter((r) => r.status === 'approved').length}
          </p>
          <p className="text-[10px] text-brown-400 mt-1">
            {riders.filter((r) => r.online).length} currently active on road
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-xs">
          <div className="flex items-center justify-between text-brown-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Platform Take Rate</span>
            <Percent className="h-4 w-4 text-warning" />
          </div>
          <p className="font-heading text-2xl font-bold text-brown-900 mt-2">
            {feeConfig.shopCommissionPct}%
          </p>
          <p className="text-[10px] text-brown-400 mt-1">
            ₹{feeConfig.platformFee} buyer convenience fee
          </p>
        </Card>
      </div>

      {/* Platform Settlement & Revenue Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-3.5 bg-cream-1/50 border-cream-3">
          <span className="text-[10px] font-bold uppercase text-brown-400">Platform Fees Collected</span>
          <p className="font-heading text-lg font-bold text-brown-900 mt-1">
            {formatINR(adminMetrics.platformFeeCollected)}
          </p>
          <p className="text-[10px] text-brown-500">From ₹30 buyer convenience</p>
        </Card>

        <Card className="p-3.5 bg-cream-1/50 border-cream-3">
          <span className="text-[10px] font-bold uppercase text-brown-400">Commission Earned</span>
          <p className="font-heading text-lg font-bold text-success mt-1">
            {formatINR(adminMetrics.commissionTotal)}
          </p>
          <p className="text-[10px] text-brown-500">{adminMetrics.completedOrders} orders fulfilled</p>
        </Card>

        <Card className="p-3.5 bg-cream-1/50 border-cream-3">
          <span className="text-[10px] font-bold uppercase text-brown-400">COD Awaiting Handover</span>
          <p className="font-heading text-lg font-bold text-warning-dark mt-1">
            {formatINR(adminMetrics.codAwaitingHandover)}
          </p>
          <p className="text-[10px] text-brown-500">Held by student fleet</p>
        </Card>

        <Card className="p-3.5 bg-cream-1/50 border-cream-3">
          <span className="text-[10px] font-bold uppercase text-brown-400">Active / Pending Deliveries</span>
          <p className="font-heading text-lg font-bold text-info mt-1">
            {adminMetrics.pendingDeliveries}
          </p>
          <p className="text-[10px] text-brown-500">{adminMetrics.activeOrders} active cluster checkouts</p>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-Day GMV Trend */}
        <Card className="p-4 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-sm font-bold text-brown-900">Weekly GMV Volume</h3>
              <p className="text-[11px] text-brown-400">Total sales across all Tier 2/3 active hubs</p>
            </div>
            <Badge tone="orange">Pilot Network</Badge>
          </div>
          <LineChart data={gmvTrend} format={(v) => `₹${(v / 1000).toFixed(0)}k`} height={180} />
        </Card>

        {/* Order Status Breakdown */}
        <Card className="p-4 space-y-3">
          <div>
            <h3 className="font-heading text-sm font-bold text-brown-900">Order Health</h3>
            <p className="text-[11px] text-brown-400">Status share across 92 active orders</p>
          </div>
          <div className="flex justify-center py-2">
            <DonutChart data={orderStatusSplit} centerLabel="Success" centerValue="78%" size={160} />
          </div>
        </Card>
      </div>

      {/* Cluster Area Performance */}
      <Card className="overflow-hidden">
        <div className="border-b border-cream-3 bg-cream-1 px-4 py-3">
          <h3 className="font-heading text-sm font-bold text-brown-900">
            Regional Cluster Breakdown
          </h3>
          <p className="text-[11px] text-brown-400">
            Bhadohi (UP) · Nalanda (BR) · Banswara (RJ) pilot network
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cream-3 bg-cream-2 text-[10px] font-bold uppercase tracking-wider text-brown-500">
              <tr>
                <th className="py-2.5 px-4">Area & District</th>
                <th className="py-2.5 px-3">Serviceability</th>
                <th className="py-2.5 px-3">Total Orders</th>
                <th className="py-2.5 px-3">GMV</th>
                <th className="py-2.5 px-3">Active Fleet</th>
                <th className="py-2.5 px-4 text-right">Avg SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-3 text-brown-800">
              {areaPerformance.map((row) => (
                <tr key={row.area} className="hover:bg-cream-1/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-brown-900">
                    {row.area}
                    <span className="block text-[10px] font-normal text-brown-400">{row.district}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge
                      tone={
                        row.serviceability === 'full'
                          ? 'success'
                          : row.serviceability === 'pickup'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {row.serviceability.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 font-medium">{row.orders}</td>
                  <td className="py-2.5 px-3 font-semibold">{formatINR(row.gmv)}</td>
                  <td className="py-2.5 px-3">{row.riders} riders</td>
                  <td className="py-2.5 px-4 text-right text-brown-500">{row.animal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/admin/shops"
          className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs hover:border-orange-300 transition-colors"
        >
          <Store className="h-5 w-5 text-orange-500" />
          <h4 className="mt-2 text-xs font-bold text-brown-900">Shops & KYC</h4>
          <p className="text-[10px] text-brown-400">Approve or suspend stores</p>
        </Link>

        <Link
          to="/admin/deliveries"
          className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs hover:border-orange-300 transition-colors"
        >
          <Truck className="h-5 w-5 text-info" />
          <h4 className="mt-2 text-xs font-bold text-brown-900">Dispatch Desk</h4>
          <p className="text-[10px] text-brown-400">Manual rider assignment</p>
        </Link>

        <Link
          to="/admin/fees"
          className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs hover:border-orange-300 transition-colors"
        >
          <Percent className="h-5 w-5 text-warning" />
          <h4 className="mt-2 text-xs font-bold text-brown-900">Fees & Rules</h4>
          <p className="text-[10px] text-brown-400">Commission & delivery charges</p>
        </Link>

        <Link
          to="/admin/settlements"
          className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs hover:border-orange-300 transition-colors"
        >
          <Wallet className="h-5 w-5 text-success" />
          <h4 className="mt-2 text-xs font-bold text-brown-900">Settlements</h4>
          <p className="text-[10px] text-brown-400">{pendingSettlementsCount} payouts pending</p>
        </Link>
      </div>

      <DemoNote>Super Admin changes immediately cascade across Buyer, Merchant, and Rider experiences in real-time.</DemoNote>
    </div>
  )
}
