import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Download,
  PackagePlus,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Warehouse,
} from 'lucide-react'
import type { Product } from '@/types'
import { categoryName } from '@/data/categories'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Stat,
  Tabs,
} from '@/components/ui/primitives'
import { ProductImage } from '@/components/ui/images'
import { DemoNote, SearchInput, TableWrap, tdClass, thClass } from '@/components/shared/dashboard'
import { cn, downloadCsv, formatINR, timeAgo } from '@/utils'

type Filter = 'all' | 'low' | 'out' | 'expiring' | 'deals'

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export function ShopInventoryPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shop = useCatalogStore((s) => s.shops.find((item) => item.id === shopId))
  const products = useCatalogStore((s) => s.products)
  const updateStock = useCatalogStore((s) => s.updateStock)
  const toggleStock = useCatalogStore((s) => s.toggleStock)

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [restock, setRestock] = useState<Product | null>(null)
  const [amount, setAmount] = useState('20')
  const [bulkOpen, setBulkOpen] = useState(false)

  const mine = useMemo(
    () => products.filter((product) => product.shopId === shopId && !product.archived),
    [products, shopId],
  )

  const counts = useMemo(
    () => ({
      all: mine.length,
      low: mine.filter((product) => product.inStock && product.stock <= 5).length,
      out: mine.filter((product) => !product.inStock || product.stock === 0).length,
      expiring: mine.filter((product) => {
        const days = daysUntil(product.expiry)
        return days !== null && days <= 7
      }).length,
      deals: mine.filter((product) => product.deal).length,
    }),
    [mine],
  )

  const units = mine.reduce((sum, product) => sum + product.stock, 0)
  const value = mine.reduce((sum, product) => sum + product.stock * product.price, 0)
  const lowOrOut = mine.filter((product) => !product.inStock || product.stock <= 5)

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return mine
      .filter((product) => {
        if (filter === 'low') return product.inStock && product.stock <= 5
        if (filter === 'out') return !product.inStock || product.stock === 0
        if (filter === 'expiring') {
          const days = daysUntil(product.expiry)
          return days !== null && days <= 7
        }
        if (filter === 'deals') return Boolean(product.deal)
        return true
      })
      .filter((product) => {
        if (!term) return true
        return [product.name, categoryName(product.categoryId), ...product.tags]
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
      .sort((a, b) => a.stock - b.stock)
  }, [mine, filter, query])

  const exportCsv = () => {
    downloadCsv(
      `${shop?.name ?? 'shop'}-inventory.csv`,
      visible.map((product) => ({
        product: product.name,
        category: categoryName(product.categoryId),
        unit: product.unit,
        price: product.price,
        stock: product.stock,
        status: !product.inStock ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock',
        expiry: product.expiry ?? '',
        updated: product.stockUpdatedAt,
      })),
    )
    toast('Inventory CSV exported', `${visible.length} rows downloaded.`, 'success')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        subtitle="Keep stock, availability and expiry dates accurate so buyers never see sold-out items as available."
        action={
          <>
            <Button variant="secondary" size="sm" leftIcon={Download} onClick={exportCsv} disabled={!visible.length}>
              Export
            </Button>
            <Button
              size="sm"
              leftIcon={PackagePlus}
              onClick={() => {
                setAmount('20')
                setBulkOpen(true)
              }}
              disabled={lowOrOut.length === 0}
            >
              Restock alerts
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Units on shelf" value={units} hint={`${mine.length} live products`} icon={Boxes} tone="orange" />
        <Stat label="Stock value" value={formatINR(value)} hint="At current selling prices" icon={Warehouse} tone="info" />
        <Stat
          label="Low or out"
          value={lowOrOut.length}
          hint={`${counts.out} out of stock`}
          icon={AlertTriangle}
          tone={lowOrOut.length ? 'warning' : 'success'}
        />
        <Stat
          label="Expiring soon"
          value={counts.expiring}
          hint="Within 7 days"
          icon={CalendarClock}
          tone={counts.expiring ? 'danger' : 'neutral'}
        />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search inventory…" />
          <Tabs
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'low', label: 'Low stock', count: counts.low },
              { id: 'out', label: 'Out', count: counts.out },
              { id: 'expiring', label: 'Expiring', count: counts.expiring },
              { id: 'deals', label: 'Deals', count: counts.deals },
            ]}
            className="mx-0"
          />
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Boxes}
            title="Nothing to show"
            description={
              filter === 'all'
                ? 'Add products from the Products page to start tracking stock.'
                : 'No products match this filter right now.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                Show all inventory
              </Button>
            }
          />
        </Card>
      ) : (
        <TableWrap minWidth="min-w-[760px]">
          <thead>
            <tr>
              <th className={thClass}>Product</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Stock</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Expiry</th>
              <th className={thClass}>Updated</th>
              <th className={cn(thClass, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => {
              const days = daysUntil(product.expiry)
              return (
                <tr key={product.id} className="transition-colors hover:bg-cream-2/30">
                  <td className={tdClass}>
                    <div className="flex items-center gap-2.5">
                      <ProductImage name={product.name} categoryId={product.categoryId} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-brown-900">{product.name}</p>
                        <p className="text-[9.5px] text-brown-400">
                          {categoryName(product.categoryId)} · {product.unit}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <p className="font-medium text-brown-800">{formatINR(product.price)}</p>
                    {product.deal && (
                      <p className="text-[9px] text-orange-600">deal {formatINR(product.deal.dealPrice)}</p>
                    )}
                  </td>
                  <td className={tdClass}>
                    <span
                      className={cn(
                        'font-heading text-sm font-semibold',
                        product.stock === 0 ? 'text-danger' : product.stock <= 5 ? 'text-warning' : 'text-brown-900',
                      )}
                    >
                      {product.stock}
                    </span>
                    <span className="ml-1 text-[9px] text-brown-400">{product.unit}</span>
                  </td>
                  <td className={tdClass}>
                    {!product.inStock ? (
                      <Badge tone="danger">Unavailable</Badge>
                    ) : product.stock <= 5 ? (
                      <Badge tone="warning">Low stock</Badge>
                    ) : (
                      <Badge tone="success">In stock</Badge>
                    )}
                  </td>
                  <td className={tdClass}>
                    {days === null ? (
                      <span className="text-[10px] text-brown-300">—</span>
                    ) : days < 0 ? (
                      <Badge tone="danger">Expired</Badge>
                    ) : days <= 7 ? (
                      <Badge tone="warning">{days} day{days === 1 ? '' : 's'}</Badge>
                    ) : (
                      <span className="text-[10px] text-brown-400">{days} days</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <span className="text-[10px] text-brown-400">{timeAgo(product.stockUpdatedAt)}</span>
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={PackagePlus}
                        onClick={() => {
                          setRestock(product)
                          setAmount(String(Math.max(10, product.stock)))
                        }}
                      >
                        Stock
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={product.inStock ? ToggleRight : ToggleLeft}
                        onClick={() => {
                          toggleStock(product.id)
                          toast(
                            product.inStock ? 'Marked unavailable' : 'Marked available',
                            product.name,
                            product.inStock ? 'warning' : 'success',
                          )
                        }}
                      >
                        {product.inStock ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      )}

      <DemoNote>Stock changes are saved in this browser and reflected on the buyer storefront.</DemoNote>

      <Modal
        open={Boolean(restock)}
        onClose={() => setRestock(null)}
        title={`Update stock · ${restock?.name ?? ''}`}
        description="Set the exact quantity on the shelf."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRestock(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!restock) return
                const next = Math.max(0, Math.floor(Number(amount) || 0))
                updateStock(restock.id, next)
                toast('Stock updated', `${restock.name} → ${next} ${restock.unit}`, 'success')
                setRestock(null)
              }}
            >
              Save stock
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {[0, 5, 10, 20, 50, 100].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  Number(amount) === value
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-cream-3 bg-white text-brown-500',
                )}
              >
                {value === 0 ? 'Out of stock' : `+${value}`}
              </button>
            ))}
          </div>
          <Input
            label="New stock quantity"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
            hint={`Currently ${restock?.stock ?? 0} ${restock?.unit ?? ''} on shelf.`}
          />
          <div className="flex items-center gap-2 rounded-xl bg-cream-2/60 p-2.5 text-[10px] text-brown-400">
            <RotateCcw className="h-3.5 w-3.5" />
            Setting 0 hides the product from search until it is restocked.
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={bulkOpen}
        title={`Restock ${lowOrOut.length} low-stock items?`}
        description="Items below 6 units (and out-of-stock items) will be set to 20 units. You can adjust each one afterwards."
        confirmLabel="Restock all"
        onClose={() => setBulkOpen(false)}
        onConfirm={() => {
          lowOrOut.forEach((product) => updateStock(product.id, 20))
          toast('Inventory restocked', `${lowOrOut.length} products set to 20 units.`)
        }}
      />
    </div>
  )
}
