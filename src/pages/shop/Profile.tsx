import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  Clock,
  MapPin,
  Phone,
  Plus,
  Rocket,
  Save,
  Store,
  Truck,
  X,
} from 'lucide-react'
import type { Shop } from '@/types'
import { categories } from '@/data/categories'
import { useActivityStore } from '@/store/activity'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Stat,
  Textarea,
  Toggle,
} from '@/components/ui/primitives'
import { ShopAvatar } from '@/components/ui/images'
import { DemoNote, InfoBanner, KeyValue } from '@/components/shared/dashboard'
import { cn, shopStatusMeta } from '@/utils'

export function ShopProfilePage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shops = useCatalogStore((s) => s.shops)
  const products = useCatalogStore((s) => s.products)
  const updateShop = useCatalogStore((s) => s.updateShop)
  const shop = shops.find((item) => item.id === shopId)

  if (!shop) {
    return (
      <Card>
        <p className="text-sm text-brown-500">
          Shop profile not found. Reset the demo to restore the seeded shop.
        </p>
      </Card>
    )
  }

  return <ProfileForm key={shop.id} shop={shop} productCount={products.filter((p) => p.shopId === shop.id && !p.archived).length} updateShop={updateShop} />
}

type UpdateShop = (shopId: string, patch: Partial<Shop>) => void

function ProfileForm({
  shop,
  productCount,
  updateShop,
}: {
  shop: Shop
  productCount: number
  updateShop: UpdateShop
}) {
  const log = useActivityStore((s) => s.log)
  const [draft, setDraft] = useState({
    name: shop.name,
    tagline: shop.tagline,
    ownerName: shop.ownerName,
    phone: shop.phone,
    categoryId: shop.categoryId,
    address: shop.address,
    village: shop.village,
    town: shop.town,
    district: shop.district,
    state: shop.state,
    pincode: shop.pincode,
    prepTimeMins: String(shop.prepTimeMins),
  })
  const [pinInput, setPinInput] = useState('')
  const [delivery, setDelivery] = useState(shop.delivery)
  const [pickup, setPickup] = useState(shop.pickup)
  const [pins, setPins] = useState<string[]>(shop.servicePins)
  const [saving, setSaving] = useState(false)

  const status = shopStatusMeta[shop.status]
  const dirty =
    draft.name !== shop.name ||
    draft.tagline !== shop.tagline ||
    draft.ownerName !== shop.ownerName ||
    draft.phone !== shop.phone ||
    draft.categoryId !== shop.categoryId ||
    draft.address !== shop.address ||
    draft.village !== shop.village ||
    draft.town !== shop.town ||
    draft.district !== shop.district ||
    draft.state !== shop.state ||
    draft.pincode !== shop.pincode ||
    draft.prepTimeMins !== String(shop.prepTimeMins) ||
    delivery !== shop.delivery ||
    pickup !== shop.pickup ||
    pins.join(',') !== shop.servicePins.join(',')

  const addPin = () => {
    const value = pinInput.replace(/\D/g, '')
    if (value.length !== 6) {
      toast('PIN code needs 6 digits', 'Example: 221304', 'warning')
      return
    }
    if (pins.includes(value)) {
      toast('PIN already added', value, 'info')
      return
    }
    setPins((list) => [...list, value])
    setPinInput('')
  }

  const save = () => {
    if (!draft.name.trim() || !draft.ownerName.trim() || !draft.town.trim()) {
      toast('Check the details', 'Shop name, owner name and town are required.', 'warning')
      return
    }
    if (draft.pincode.replace(/\D/g, '').length !== 6) {
      toast('Invalid PIN code', 'The shop PIN code must be 6 digits.', 'warning')
      return
    }
    if (!delivery && !pickup) {
      toast('Choose a fulfilment mode', 'Enable delivery, pickup or both.', 'warning')
      return
    }
    setSaving(true)
    const category = categories.find((item) => item.id === draft.categoryId)
    const patch: Partial<Shop> = {
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      ownerName: draft.ownerName.trim(),
      phone: draft.phone.trim(),
      categoryId: draft.categoryId,
      categoryName: category?.name ?? shop.categoryName,
      address: draft.address.trim(),
      village: draft.village.trim(),
      town: draft.town.trim(),
      district: draft.district.trim(),
      state: draft.state.trim(),
      pincode: draft.pincode.replace(/\D/g, ''),
      prepTimeMins: Math.max(5, Math.min(120, Math.floor(Number(draft.prepTimeMins) || shop.prepTimeMins))),
      delivery,
      pickup,
      servicePins: pins,
    }
    updateShop(shop.id, patch)
    log({
      actor: draft.ownerName.trim(),
      role: 'shopkeeper',
      action: 'Shop profile updated',
      targetType: 'shop',
      targetLabel: shop.id,
      description: `Updated shop details, fulfilment and ${pins.length} service PIN code${pins.length === 1 ? '' : 's'}.`,
    })
    toast('Shop profile saved', 'Buyers now see the updated shop details.', 'success')
    window.setTimeout(() => setSaving(false), 250)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Shop profile"
        subtitle="Control how your shop appears to buyers, where you deliver and when you are open."
        action={
          <Badge tone="neutral">
            <span className={cn('h-1.5 w-1.5 rounded-full', status.tone.includes('success') ? 'bg-success' : 'bg-warning')} />
            {status.label}
          </Badge>
        }
      />

      {shop.status !== 'approved' && (
        <InfoBanner
          tone={shop.status === 'rejected' ? 'danger' : 'warning'}
          title={
            shop.status === 'pending'
              ? 'Profile changes are under review'
              : shop.status === 'rejected'
                ? 'Shop application was rejected'
                : 'Shop is suspended'
          }
          icon={AlertTriangle}
          action={
            <Link to="/shop/onboarding">
              <Button size="sm" variant="secondary">
                Open onboarding
              </Button>
            </Link>
          }
        >
          {shop.status === 'rejected'
            ? shop.rejectionReason ?? 'Fix the details below, then resubmit from onboarding.'
            : 'Buyers cannot place new orders until the demo admin approves the shop.'}
        </InfoBanner>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">Store details</h2>
                <p className="text-[11px] text-brown-400">Shown on your storefront and shop cards.</p>
              </div>
              <Store className="h-4 w-4 text-orange-500" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Shop name"
                required
                className="sm:col-span-2"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <Input
                label="Tagline"
                className="sm:col-span-2"
                value={draft.tagline}
                onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
                placeholder="One line buyers remember you by"
              />
              <Input
                label="Owner name"
                required
                value={draft.ownerName}
                onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })}
              />
              <Input
                label="Contact phone"
                leftIcon={Phone}
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
              <Select
                label="Primary category"
                value={draft.categoryId}
                options={categories.map((category) => ({
                  value: category.id,
                  label: `${category.emoji} ${category.name}`,
                }))}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    categoryId: event.target.value,
                  })
                }
              />
              <Input
                label="Average prep time (minutes)"
                inputMode="numeric"
                value={draft.prepTimeMins}
                onChange={(event) =>
                  setDraft({ ...draft, prepTimeMins: event.target.value.replace(/\D/g, '') })
                }
                hint="Buyers see this as an estimate."
              />
              <Textarea
                label="Shop address"
                required
                rows={2}
                className="sm:col-span-2"
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                placeholder="Street, landmark, bazaar"
              />
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="font-heading text-base font-semibold text-brown-900">Location</h2>
              <p className="text-[11px] text-brown-400">Used to match buyers and delivery riders near you.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Village / area"
                value={draft.village}
                onChange={(event) => setDraft({ ...draft, village: event.target.value })}
              />
              <Input
                label="Town"
                required
                value={draft.town}
                onChange={(event) => setDraft({ ...draft, town: event.target.value })}
              />
              <Input
                label="District"
                value={draft.district}
                onChange={(event) => setDraft({ ...draft, district: event.target.value })}
              />
              <Input
                label="State"
                value={draft.state}
                onChange={(event) => setDraft({ ...draft, state: event.target.value })}
              />
              <Input
                label="PIN code"
                required
                inputMode="numeric"
                maxLength={6}
                value={draft.pincode}
                onChange={(event) =>
                  setDraft({ ...draft, pincode: event.target.value.replace(/\D/g, '') })
                }
              />
              <div className="flex items-end">
                <p className="rounded-lg bg-cream-2/70 px-2.5 py-2 text-[10px] leading-relaxed text-brown-400">
                  We match riders by PIN code first, then by straight-line distance.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-brown-900">Fulfilment & service area</h2>
                <p className="text-[11px] text-brown-400">Choose how buyers receive orders and which PIN codes you serve.</p>
              </div>
              <Truck className="h-4 w-4 text-orange-500" />
            </div>

            <div className="space-y-1">
              <div className="border-b border-cream-2 py-2.5">
                <Toggle
                  checked={delivery}
                  onChange={(value) => setDelivery(value)}
                  label="Home delivery"
                  description="Riders collect ready orders from your counter and drop them to buyers."
                />
              </div>
              <div className="border-b border-cream-2 py-2.5">
                <Toggle
                  checked={pickup}
                  onChange={(value) => setPickup(value)}
                  label="Self pickup"
                  description="Buyers collect from your counter using their order ID."
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium text-brown-600">Service PIN codes</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {pins.length === 0 && (
                  <span className="text-[11px] text-brown-300">No PIN codes yet — add at least one.</span>
                )}
                {pins.map((pin) => (
                  <span
                    key={pin}
                    className="inline-flex items-center gap-1 rounded-full border border-cream-4 bg-cream-2/70 px-2.5 py-1 text-[11px] font-medium text-brown-600"
                  >
                    <MapPin className="h-3 w-3 text-orange-500" />
                    {pin}
                    <button
                      type="button"
                      aria-label={`Remove PIN ${pin}`}
                      onClick={() => setPins((list) => list.filter((item) => item !== pin))}
                      className="ml-0.5 text-brown-300 hover:text-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <Input
                  placeholder="Add PIN code"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(event) => setPinInput(event.target.value.replace(/\D/g, ''))}
                  className="max-w-[160px]"
                />
                <Button size="sm" variant="secondary" leftIcon={Plus} onClick={addPin}>
                  Add PIN
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-brown-300">
                Aurai (221301) is pickup-only in the demo. Buyers there cannot choose delivery.
              </p>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cream-3 bg-white/70 px-4 py-3">
            <p className="text-[11px] text-brown-400">
              {dirty ? 'You have unsaved changes.' : 'All shop details are saved.'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDraft({
                    name: shop.name,
                    tagline: shop.tagline,
                    ownerName: shop.ownerName,
                    phone: shop.phone,
                    categoryId: shop.categoryId,
                    address: shop.address,
                    village: shop.village,
                    town: shop.town,
                    district: shop.district,
                    state: shop.state,
                    pincode: shop.pincode,
                    prepTimeMins: String(shop.prepTimeMins),
                  })
                }
                disabled={!dirty}
              >
                Discard
              </Button>
              <Button size="sm" leftIcon={Save} onClick={save} disabled={!dirty} loading={saving}>
                Save changes
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-400">Storefront preview</p>
            <div className={cn('mt-2 rounded-xl border border-cream-3 bg-gradient-to-br p-3', shop.tint)}>
              <div className="flex items-start gap-2.5">
                <ShopAvatar name={draft.name || shop.name} tint="from-white/80 to-cream-2" size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-semibold text-brown-900">
                    {draft.name || 'Your shop name'}
                  </p>
                  <p className="line-clamp-2 text-[10px] leading-relaxed text-brown-500">
                    {draft.tagline || 'Your tagline appears here.'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pickup && <Badge tone="info">Pickup</Badge>}
                    {delivery && <Badge tone="success">Delivery</Badge>}
                    {!shop.open && <Badge tone="neutral">Closed</Badge>}
                  </div>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-brown-500">
                <MapPin className="h-3 w-3 shrink-0" />
                {[draft.village, draft.town, draft.pincode].filter(Boolean).join(', ') || 'Add a location'}
              </p>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-brown-300">
              Preview only — save to publish these changes to buyers.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-brown-900">Shop settings</h2>
            <div className="mt-3">
              <Toggle
                checked={shop.open}
                onChange={(value) => {
                  updateShop(shop.id, { open: value })
                  toast(
                    value ? 'Shop is open' : 'Shop is closed',
                    value ? 'Buyers can place orders again.' : 'New orders are paused, browsing still works.',
                    value ? 'success' : 'info',
                  )
                }}
                label="Accepting orders"
                description={shop.open ? 'Buyers can check out from your shop.' : 'Your catalogue is visible, checkout is paused.'}
              />
            </div>
            <div className="mt-3 space-y-1.5 border-t border-cream-3 pt-3">
              <KeyValue label="Status">{status.label}</KeyValue>
              <KeyValue label="Category">{draft.categoryId ? categories.find((c) => c.id === draft.categoryId)?.name : shop.categoryName}</KeyValue>
              <KeyValue label="Live products">{productCount}</KeyValue>
              <KeyValue label="Commission">{shop.commissionPct}%</KeyValue>
              <KeyValue label="Selling since">{shop.since}</KeyValue>
              <KeyValue label="Rating">
                {shop.rating > 0 ? `${shop.rating.toFixed(1)} ★ (${shop.reviewCount})` : 'No ratings yet'}
              </KeyValue>
            </div>
            <Link to="/shop/onboarding" className="mt-3 block">
              <Button variant="secondary" size="sm" className="w-full" leftIcon={Rocket}>
                Onboarding & KYC
              </Button>
            </Link>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-brown-900">Store hours</h2>
            <div className="mt-2 space-y-2">
              {[
                { day: 'Mon – Sat', time: '7:00 am – 9:00 pm' },
                { day: 'Sunday', time: '8:00 am – 2:00 pm' },
              ].map((row) => (
                <div key={row.day} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-brown-500">{row.day}</span>
                  <span className="font-medium text-brown-800">{row.time}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-cream-2/60 p-2 text-[10px] leading-relaxed text-brown-400">
              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
              Store hours are display-only in this demo. Use the Accepting orders switch to control checkout.
            </p>
          </Card>

          <div className="rounded-2xl border border-success/20 bg-success-soft/50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <Check className="h-3.5 w-3.5" /> Profile checklist
            </p>
            <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-brown-500">
              <li>{draft.name && draft.ownerName ? '✓' : '○'} Shop name and owner details</li>
              <li>{draft.pincode.length === 6 ? '✓' : '○'} Valid shop PIN code</li>
              <li>{pins.length > 0 ? '✓' : '○'} At least one service PIN</li>
              <li>{pickup || delivery ? '✓' : '○'} Pickup or delivery enabled</li>
            </ul>
          </div>

          <DemoNote>Shop profile changes are stored in this browser only.</DemoNote>
        </div>
      </div>
    </div>
  )
}
