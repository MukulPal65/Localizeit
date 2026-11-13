import { useState, useMemo } from 'react'
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Phone,
  Power,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  XCircle,
} from 'lucide-react'
import { useCatalogStore } from '@/store/catalog'
import { approveShop, rejectShop, setShopSuspension } from '@/services/workflow'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import type { Shop, ShopStatus } from '@/types'

export function AdminShopsPage() {
  const shops = useCatalogStore((s) => s.shops)
  const products = useCatalogStore((s) => s.products)

  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all')
  const [search, setSearch] = useState('')
  const [rejectingShop, setRejectingShop] = useState<Shop | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      if (tab !== 'all' && shop.status !== tab) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        shop.name.toLowerCase().includes(q) ||
        shop.ownerName.toLowerCase().includes(q) ||
        shop.town.toLowerCase().includes(q) ||
        shop.categoryName.toLowerCase().includes(q)
      )
    })
  }, [shops, tab, search])

  const pendingCount = useMemo(() => shops.filter((s) => s.status === 'pending').length, [shops])

  const handleConfirmReject = () => {
    if (!rejectingShop || !rejectReason.trim()) return
    rejectShop(rejectingShop.id, rejectReason.trim())
    setRejectingShop(null)
    setRejectReason('')
  }

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="Merchant Management"
        subtitle="Review onboarding applications, configure commission rates, and audit shop compliance."
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search shops, owners, towns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={Search}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex w-full sm:w-auto rounded-xl border border-cream-3 bg-white p-1 text-xs">
          {(['all', 'pending', 'approved', 'suspended'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 font-semibold capitalize transition-all ${
                tab === key
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-brown-500 hover:text-brown-800'
              }`}
            >
              {key}
              {key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[9px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Shops Table / Cards */}
      {filteredShops.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No Merchants Found"
          description="Try adjusting your filter or search keywords."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredShops.map((shop) => {
            const shopProductCount = products.filter((p) => p.shopId === shop.id).length
            const isPending = shop.status === 'pending'
            const isSuspended = shop.status === 'suspended'
            const isApproved = shop.status === 'approved'

            return (
              <Card
                key={shop.id}
                className={`p-4 transition-shadow hover:shadow-soft flex flex-col justify-between ${
                  isPending ? 'border-warning/50 bg-warning-soft/20' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-sm font-bold text-brown-900">{shop.name}</h3>
                        <Badge
                          tone={
                            isApproved
                              ? 'success'
                              : isPending
                                ? 'warning'
                                : isSuspended
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {shop.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-brown-600 mt-0.5">
                        {shop.ownerName} · <a href={`tel:${shop.phone}`} className="hover:underline">{shop.phone}</a>
                      </p>
                    </div>

                    <span className="rounded-lg bg-cream-2 px-2 py-1 text-[10px] font-bold text-brown-600 shrink-0">
                      {shop.categoryName}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-brown-600">
                    <div className="flex items-center gap-1.5 text-brown-500">
                      <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{shop.address}, {shop.town} ({shop.pincode})</span>
                      {shop.lat && shop.lng && (
                        <span className="text-[10px] text-brown-400 font-mono">
                          [{shop.lat.toFixed(4)}, {shop.lng.toFixed(4)}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-brown-400 pt-1">
                      <span>{shopProductCount} products in stock</span>
                      <span>{shop.commissionPct}% commission</span>
                      <span>Rating: {shop.rating} ★</span>
                    </div>

                    {shop.openingHours && (
                      <div className="text-[11px] text-brown-500 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-brown-400" />
                        <span>Hours: {shop.openingHours}</span>
                      </div>
                    )}

                    {shop.rejectionReason && (
                      <p className="rounded-lg bg-danger-soft p-2 text-[10px] text-danger">
                        <span className="font-semibold">Rejection notice: </span>{shop.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-cream-2 pt-3">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-brown-400">Fulfilment: </span>
                    {shop.delivery && <Badge tone="neutral">Delivery</Badge>}
                    {shop.pickup && <Badge tone="neutral">Pickup</Badge>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => {
                            setRejectingShop(shop)
                            setRejectReason('Incomplete business registration or store photos.')
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => approveShop(shop.id)}
                          leftIcon={CheckCircle2}
                        >
                          Approve
                        </Button>
                      </>
                    )}

                    {isApproved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-warning hover:bg-warning-soft"
                        onClick={() => setShopSuspension(shop.id, true)}
                        leftIcon={Ban}
                      >
                        Suspend
                      </Button>
                    )}

                    {isSuspended && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShopSuspension(shop.id, false)}
                        leftIcon={RotateCcw}
                      >
                        Reinstate
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        open={Boolean(rejectingShop)}
        onClose={() => setRejectingShop(null)}
        title={`Reject ${rejectingShop?.name}`}
        description="Specify the reason why this merchant application does not meet guidelines."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejectingShop(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-brown-700">Rejection Reason</label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full rounded-xl border border-cream-4 bg-white p-2.5 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-danger"
            placeholder="e.g. Shop photos unclear or invalid GSTIN/trade license."
          />
        </div>
      </Modal>

      <DemoNote>Approved shops instantly appear on buyer home and search feeds.</DemoNote>
    </div>
  )
}
