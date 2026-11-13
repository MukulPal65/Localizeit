import { useMemo, useState } from 'react'
import {
  Archive,
  BadgePercent,
  Edit3,
  Package,
  Plus,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { Product } from '@/types'
import { categories, categoryName } from '@/data/categories'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  Tabs,
  Textarea,
} from '@/components/ui/primitives'
import { ProductImage } from '@/components/ui/images'
import { DemoNote, SearchInput, TableWrap, tdClass, thClass } from '@/components/shared/dashboard'
import { cn, formatINR, makeId, nowISO, timeAgo } from '@/utils'
import { isDemoMode } from '@/config/env'

type Filter = 'live' | 'low' | 'out' | 'deals' | 'archived'

interface Draft {
  id?: string
  name: string
  categoryId: string
  unit: string
  price: string
  mrp: string
  stock: string
  expiry: string
  description: string
  tags: string
  imageUrl?: string
}

const emptyDraft = (categoryId: string): Draft => ({
  name: '',
  categoryId,
  unit: '1 pc',
  price: '',
  mrp: '',
  stock: '10',
  expiry: '',
  description: '',
  tags: '',
  imageUrl: '',
})

export function ShopProductsPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shops = useCatalogStore((s) => s.shops)
  const products = useCatalogStore((s) => s.products)
  const addProduct = useCatalogStore((s) => s.addProduct)
  const updateProduct = useCatalogStore((s) => s.updateProduct)
  const archiveProduct = useCatalogStore((s) => s.archiveProduct)
  const toggleStock = useCatalogStore((s) => s.toggleStock)
  const shop = shops.find((item) => item.id === shopId)

  const [filter, setFilter] = useState<Filter>('live')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)

  const mine = useMemo(
    () => products.filter((product) => product.shopId === shopId),
    [products, shopId],
  )

  const counts = useMemo(
    () => ({
      live: mine.filter((product) => !product.archived).length,
      low: mine.filter((product) => !product.archived && product.inStock && product.stock <= 5).length,
      out: mine.filter((product) => !product.archived && !product.inStock).length,
      deals: mine.filter((product) => !product.archived && product.deal).length,
      archived: mine.filter((product) => product.archived).length,
    }),
    [mine],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return mine
      .filter((product) => {
        if (filter === 'archived') return product.archived
        if (product.archived) return false
        if (filter === 'low') return product.inStock && product.stock <= 5
        if (filter === 'out') return !product.inStock
        if (filter === 'deals') return Boolean(product.deal)
        return true
      })
      .filter((product) => {
        if (!term) return true
        return [product.name, categoryName(product.categoryId), product.unit, ...product.tags]
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
  }, [mine, filter, query])

  const saveDraft = () => {
    if (!draft) return
    const price = Number(draft.price)
    const mrp = draft.mrp.trim() ? Number(draft.mrp) : undefined
    const stock = Math.max(0, Math.floor(Number(draft.stock) || 0))
    if (!draft.name.trim() || !draft.unit.trim() || !Number.isFinite(price) || price <= 0) {
      toast('Check product details', 'Name, unit, and a selling price above ₹0 are required.', 'warning')
      return
    }
    if (mrp !== undefined && mrp > 0 && mrp < price) {
      toast('MRP invalid', 'MRP should be greater than or equal to selling price.', 'warning')
      return
    }
    // Prevent expired products
    if (draft.expiry) {
      const expDate = new Date(draft.expiry)
      if (expDate.getTime() < Date.now() - 86400000) {
        toast('Product expired', 'Cannot list or sell expired products. Check the expiry date.', 'error')
        return
      }
    }

    const tags = draft.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)

    if (draft.id) {
      updateProduct(draft.id, {
        name: draft.name.trim(),
        categoryId: draft.categoryId,
        unit: draft.unit.trim(),
        price,
        mrp: mrp && mrp > 0 ? mrp : undefined,
        stock,
        inStock: stock > 0,
        expiry: draft.expiry || undefined,
        description:
          draft.description.trim() ||
          `${draft.name.trim()} (${draft.unit.trim()}) available at ${shop?.name ?? 'your shop'}.`,
        tags,
      })
      toast('Product updated', `${draft.name.trim()} updated with audit log.`)
    } else {
      addProduct({
        id: isDemoMode ? makeId(`p-${shopId}`) : crypto.randomUUID(),
        shopId,
        name: draft.name.trim(),
        categoryId: draft.categoryId,
        unit: draft.unit.trim(),
        price,
        mrp: mrp && mrp > 0 ? mrp : undefined,
        stock,
        inStock: stock > 0,
        stockUpdatedAt: nowISO(),
        expiry: draft.expiry || undefined,
        description:
          draft.description.trim() ||
          `${draft.name.trim()} (${draft.unit.trim()}) available at ${shop?.name ?? 'your shop'}.`,
        tags,
      })
      toast('Product added', `${draft.name.trim()} is now active in your catalogue.`)
    }
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        subtitle="Add, edit and archive the items buyers see in your shop."
        action={
          <Button
            size="sm"
            leftIcon={Plus}
            onClick={() => setDraft(emptyDraft(shop?.categoryId ?? 'kirana'))}
          >
            Add product
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Live products" value={counts.live} hint="Visible to buyers" icon={Package} tone="orange" />
        <Stat label="Low stock" value={counts.low} hint="5 units or fewer" icon={Tag} tone="warning" />
        <Stat label="Out of stock" value={counts.out} hint="Hidden from search" icon={Archive} tone="danger" />
        <Stat label="Active deals" value={counts.deals} hint="Near-expiry discounts" icon={BadgePercent} tone="success" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search products or tags…" />
          <Tabs
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            items={[
              { id: 'live', label: 'Live', count: counts.live },
              { id: 'low', label: 'Low stock', count: counts.low },
              { id: 'out', label: 'Out of stock', count: counts.out },
              { id: 'deals', label: 'Deals', count: counts.deals },
              { id: 'archived', label: 'Archived', count: counts.archived },
            ]}
            className="mx-0"
          />
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={productEmptyIcon(filter)}
            title={mine.length === 0 ? 'No products yet' : 'Nothing in this view'}
            description={
              mine.length === 0
                ? 'Add your first product. Buyers can order it as soon as the shop is approved.'
                : filter === 'archived'
                  ? 'Archived products stay out of the storefront but keep their order history.'
                  : 'Try another tab or clear the search.'
            }
            action={
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={() => setDraft(emptyDraft(shop?.categoryId ?? 'kirana'))}
              >
                Add product
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((product) => (
            <Card key={product.id} className="p-3">
              <div className="flex gap-2.5">
                <ProductImage
                  name={product.name}
                  categoryId={product.categoryId}
                  size="sm"
                  deal={Boolean(product.deal)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="min-w-0 truncate text-xs font-semibold text-brown-900">{product.name}</p>
                    {product.archived ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : product.deal ? (
                      <Badge tone="orange">Deal</Badge>
                    ) : !product.inStock ? (
                      <Badge tone="danger">Out</Badge>
                    ) : product.stock <= 5 ? (
                      <Badge tone="warning">{product.stock} left</Badge>
                    ) : (
                      <Badge tone="success">Live</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-brown-400">
                    {categoryName(product.categoryId)} · {product.unit}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-brown-900">
                      {formatINR(product.deal?.dealPrice ?? product.price)}
                    </span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-[10px] text-brown-300 line-through">{formatINR(product.mrp)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[9.5px] text-brown-400">
                    Stock {product.stock} · updated {timeAgo(product.stockUpdatedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-cream-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={product.inStock ? ToggleRight : ToggleLeft}
                  onClick={() => {
                    toggleStock(product.id)
                    toast(
                      product.inStock ? 'Marked out of stock' : 'Marked in stock',
                      product.name,
                      product.inStock ? 'warning' : 'success',
                    )
                  }}
                >
                  {product.inStock ? 'Available' : 'Unavailable'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Edit3}
                  onClick={() =>
                    setDraft({
                      id: product.id,
                      name: product.name,
                      categoryId: product.categoryId,
                      unit: product.unit,
                      price: String(product.price),
                      mrp: product.mrp ? String(product.mrp) : '',
                      stock: String(product.stock),
                      expiry: product.expiry ?? '',
                      description: product.description,
                      tags: product.tags.join(', '),
                    })
                  }
                >
                  Edit
                </Button>
                {!product.archived && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Archive}
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setArchiveTarget(product)}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <DemoNote>Products live in the shared demo catalogue and immediately appear in buyer search.</DemoNote>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit product' : 'Add a product'}
        description="Prices are in ₹. Stock below 1 marks the item unavailable."
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveDraft}>
              {draft?.id ? 'Save product' : 'Add to catalogue'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product name" required className="sm:col-span-2">
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="e.g. Tata Salt"
              />
            </Field>
            <Select
              label="Category"
              value={draft.categoryId}
              options={categories.map((category) => ({
                value: category.id,
                label: `${category.emoji} ${category.name}`,
              }))}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            />
            <Input
              label="Unit"
              required
              value={draft.unit}
              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
              placeholder="1 kg / 500 g / 1 pc"
            />
            <Input
              label="Selling price (₹)"
              required
              inputMode="decimal"
              value={draft.price}
              onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/[^\d.]/g, '') })}
            />
            <Input
              label="MRP (₹)"
              inputMode="decimal"
              hint="Optional. Shows a strike-through."
              value={draft.mrp}
              onChange={(event) => setDraft({ ...draft, mrp: event.target.value.replace(/[^\d.]/g, '') })}
            />
            <Input
              label="Stock quantity"
              inputMode="numeric"
              value={draft.stock}
              onChange={(event) => setDraft({ ...draft, stock: event.target.value.replace(/\D/g, '') })}
            />
            <Input
              label="Expiry date (where applicable)"
              type="date"
              value={draft.expiry}
              onChange={(event) => setDraft({ ...draft, expiry: event.target.value })}
              hint="Required for packaged goods & dairy"
            />
            <Input
              label="Search tags"
              hint="Comma separated, e.g. salt, namak"
              value={draft.tags}
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
            />
            <Textarea
              label="Short description"
              rows={3}
              className="sm:col-span-2"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Optional. Buyers see this on the product page."
            />
            <div className={cn('rounded-xl bg-cream-2/60 p-3 text-[10px] leading-relaxed text-brown-400 sm:col-span-2')}>
              Preview: <span className="font-medium text-brown-700">{draft.name || 'Product name'}</span> ·{' '}
              {draft.price ? formatINR(Number(draft.price)) : '₹0'} · {draft.unit || 'unit'} · stock{' '}
              {draft.stock || '0'}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={`Archive ${archiveTarget?.name ?? 'product'}?`}
        description="It will be hidden from buyers and search. Past demo orders keep their item snapshot."
        confirmLabel="Archive product"
        tone="danger"
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return
          archiveProduct(archiveTarget.id)
          toast('Product archived', archiveTarget.name, 'info')
        }}
      />
    </div>
  )
}

function productEmptyIcon(filter: Filter) {
  if (filter === 'deals') return BadgePercent
  if (filter === 'archived') return Archive
  if (filter === 'out') return Search
  return Package
}
