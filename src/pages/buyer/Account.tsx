import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  CreditCard,
  Heart,
  Languages,
  LifeBuoy,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { Address } from '@/types'
import { useBuyerStore } from '@/store/buyer'
import { useCatalogStore } from '@/store/catalog'
import { toast } from '@/store/toast'
import { resetDemoData } from '@/services/demo'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Toggle,
} from '@/components/ui/primitives'
import { ProductCard, ShopCard } from '@/components/shared/ProductCard'
import { DemoNote } from '@/components/shared/dashboard'
import { cn, formatINR, languageOptions, makeId } from '@/utils'

const sections = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'favourites', label: 'Favourite shops', icon: Heart },
  { id: 'wishlist', label: 'Wishlist', icon: Bookmark },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'language', label: 'Language', icon: Languages },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'help', label: 'Help & demo', icon: LifeBuoy },
] as const

type SectionId = (typeof sections)[number]['id']

const sectionIds = sections.map((s) => s.id) as string[]

export function BuyerAccountPage() {
  const params = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const profile = useBuyerStore((s) => s.profile)
  const section: SectionId = sectionIds.includes(params.section ?? '')
    ? (params.section as SectionId)
    : 'profile'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Your account"
        subtitle="Manage your profile, saved shops and demo preferences. Everything is stored in this browser only."
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={profile.name} tint={profile.avatarTint} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-semibold text-brown-900">
                  {profile.name || 'LocalizeIt buyer'}
                </p>
                <p className="text-[11px] text-brown-400">{profile.phone}</p>
                <Badge tone="success" className="mt-1">
                  <ShieldCheck className="h-2.5 w-2.5" /> Demo account
                </Badge>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-cream-2/60 p-2.5 text-[10px] leading-relaxed text-brown-400">
              <p className="font-medium text-brown-600">
                {profile.addresses.find((a) => a.isDefault)?.town ?? 'Gyanpur'} ·{' '}
                {profile.addresses.find((a) => a.isDefault)?.pincode ?? '221304'}
              </p>
              <p>Phone login and OTP are mocked for this demo.</p>
            </div>
          </Card>

          <nav className="grid grid-cols-2 gap-1 rounded-2xl border border-cream-3 bg-white/70 p-2 lg:grid-cols-1">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/buyer/account/${item.id}`)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] font-medium transition-colors',
                  section === item.id
                    ? 'bg-brown-900 text-cream'
                    : 'text-brown-500 hover:bg-cream-2 hover:text-brown-900',
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0">
          {section === 'profile' && <ProfileSection />}
          {section === 'addresses' && <AddressesSection />}
          {section === 'favourites' && <FavouritesSection />}
          {section === 'wishlist' && <WishlistSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'language' && <LanguageSection />}
          {section === 'payments' && <PaymentsSection />}
          {section === 'help' && <HelpSection />}
        </div>
      </div>
    </div>
  )
}

function SectionShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold text-brown-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] leading-relaxed text-brown-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

function ProfileSection() {
  const profile = useBuyerStore((s) => s.profile)
  const updateProfile = useBuyerStore((s) => s.updateProfile)
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone)

  const dirty = name !== profile.name || email !== profile.email || phone !== profile.phone

  return (
    <SectionShell
      title="Personal details"
      subtitle="Your name and phone are shown to shops and riders during a delivery."
      action={<Badge tone="orange">Buyer profile</Badge>}
    >
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name || profile.name} tint={profile.avatarTint} size="lg" />
        <div className="text-[11px] leading-relaxed text-brown-400">
          <p className="font-medium text-brown-700">Profile photo is generated from your initials</p>
          <p>No photo upload is wired in the demo.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Phone number" hint="Used for demo OTP login.">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={Phone} />
        </Field>
        <Field label="Email address" className="sm:col-span-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={Mail}
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-cream-3 pt-3">
        <p className="text-[10px] text-brown-300">
          Member since 2024 · {profile.favouriteShopIds.length} favourite shops ·{' '}
          {profile.wishlistProductIds.length} wishlist items
        </p>
        <Button
          size="sm"
          disabled={!dirty || !name.trim()}
          onClick={() => {
            updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() })
            toast('Profile updated', 'Your demo buyer details were saved in this browser.')
          }}
        >
          Save changes
        </Button>
      </div>
    </SectionShell>
  )
}

function AddressesSection() {
  const profile = useBuyerStore((s) => s.profile)
  const addAddress = useBuyerStore((s) => s.addAddress)
  const updateAddress = useBuyerStore((s) => s.updateAddress)
  const removeAddress = useBuyerStore((s) => s.removeAddress)
  const setDefaultAddress = useBuyerStore((s) => s.setDefaultAddress)
  const [draft, setDraft] = useState<Address | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null)

  const openNew = () =>
    setDraft({
      id: makeId('addr'),
      label: 'Home',
      recipient: profile.name,
      phone: profile.phone,
      line1: '',
      landmark: '',
      village: '',
      town: 'Gyanpur',
      district: 'Bhadohi',
      state: 'Uttar Pradesh',
      pincode: '221304',
      isDefault: profile.addresses.length === 0,
    })

  const save = () => {
    if (!draft || !draft.line1.trim() || !draft.town.trim() || draft.pincode.length < 6) {
      toast('Check the address', 'House / street, town and a 6-digit PIN code are required.', 'warning')
      return
    }
    const exists = profile.addresses.some((a) => a.id === draft.id)
    if (exists) updateAddress(draft)
    else addAddress(draft)
    toast(exists ? 'Address updated' : 'Address added', `${draft.label} · ${draft.town}`)
    setDraft(null)
  }

  return (
    <SectionShell
      title="Saved addresses"
      subtitle="Delivery shops use the selected address. Pickup orders still show the shop location."
      action={
        <Button size="sm" leftIcon={Plus} onClick={openNew}>
          Add address
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {profile.addresses.map((address) => (
          <div
            key={address.id}
            className={cn(
              'rounded-xl border p-3',
              address.isDefault ? 'border-orange-300 bg-orange-50/40' : 'border-cream-3 bg-white/70',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-2 text-brown-500">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-brown-900">{address.label}</p>
                  <p className="text-[10px] text-brown-400">{address.recipient}</p>
                </div>
              </div>
              {address.isDefault ? <Badge tone="orange">Default</Badge> : null}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-brown-500">
              {address.line1}
              {address.landmark ? `, ${address.landmark}` : ''}
              {address.village ? `, ${address.village}` : ''}
              <br />
              {address.town}, {address.district}, {address.state} — {address.pincode}
            </p>
            <p className="mt-1 text-[10px] text-brown-400">{address.phone}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-cream-3 pt-2">
              {!address.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDefaultAddress(address.id)
                    toast('Default address updated', `${address.label}, ${address.town}`)
                  }}
                >
                  Set default
                </Button>
              )}
              <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => setDraft({ ...address })}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Trash2}
                className="text-danger hover:bg-danger-soft"
                onClick={() => setDeleteTarget(address)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {profile.addresses.length === 0 && (
          <EmptyState
            className="sm:col-span-2"
            icon={MapPin}
            title="No addresses yet"
            description="Add a home or hostel address so delivery orders know where to go."
            action={
              <Button size="sm" leftIcon={Plus} onClick={openNew}>
                Add your first address
              </Button>
            }
          />
        )}
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft && profile.addresses.some((a) => a.id === draft.id) ? 'Edit address' : 'Add address'}
        description="Demo addresses are saved locally in this browser."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save address
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Label"
              value={draft.label}
              options={[
                { value: 'Home', label: 'Home' },
                { value: 'Hostel', label: 'Hostel' },
                { value: 'Work', label: 'Work' },
                { value: 'Family', label: 'Family' },
              ]}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <Input
              label="Recipient name"
              value={draft.recipient}
              onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}
            />
            <Input
              label="House / street"
              required
              className="sm:col-span-2"
              value={draft.line1}
              onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
              placeholder="12, Bazaar Road"
            />
            <Input
              label="Landmark"
              value={draft.landmark ?? ''}
              onChange={(e) => setDraft({ ...draft, landmark: e.target.value })}
              placeholder="Opposite the bus stand"
            />
            <Input
              label="Village / area"
              value={draft.village}
              onChange={(e) => setDraft({ ...draft, village: e.target.value })}
            />
            <Input
              label="Town"
              required
              value={draft.town}
              onChange={(e) => setDraft({ ...draft, town: e.target.value })}
            />
            <Input
              label="District"
              value={draft.district}
              onChange={(e) => setDraft({ ...draft, district: e.target.value })}
            />
            <Input
              label="State"
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
            />
            <Input
              label="PIN code"
              required
              inputMode="numeric"
              maxLength={6}
              value={draft.pincode}
              onChange={(e) => setDraft({ ...draft, pincode: e.target.value.replace(/\D/g, '') })}
            />
            <Input
              label="Phone"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <div className="flex items-center pt-5">
              <Checkbox
                checked={draft.isDefault}
                onChange={(value) => setDraft({ ...draft, isDefault: value })}
                label="Use as default address"
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Remove ${deleteTarget?.label ?? 'address'}?`}
        description="Past demo orders keep their original address snapshot."
        confirmLabel="Remove address"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          removeAddress(deleteTarget.id)
          toast('Address removed', deleteTarget.label, 'info')
        }}
      />
    </SectionShell>
  )
}

function FavouritesSection() {
  const favouriteShopIds = useBuyerStore((s) => s.profile.favouriteShopIds)
  const shops = useCatalogStore((s) => s.shops)
  const favourites = useMemo(
    () => shops.filter((shop) => favouriteShopIds.includes(shop.id) && shop.status === 'approved'),
    [shops, favouriteShopIds],
  )

  return (
    <SectionShell
      title="Favourite shops"
      subtitle="Tap the heart on any shop to save it here for faster reordering."
      action={<Badge tone="neutral">{favourites.length} saved</Badge>}
    >
      {favourites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favourite shops yet"
          description="Open a nearby shop and tap the heart to keep it here."
          action={
            <Button size="sm" onClick={() => window.location.assign('/buyer/shops')}>
              Browse shops
            </Button>
          }
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {favourites.map((shop) => (
            <ShopCard key={shop.id} shop={shop} variant="horizontal" />
          ))}
        </div>
      )}
    </SectionShell>
  )
}

function WishlistSection() {
  const wishlistIds = useBuyerStore((s) => s.profile.wishlistProductIds)
  const products = useCatalogStore((s) => s.products)
  const items = useMemo(
    () => products.filter((product) => wishlistIds.includes(product.id) && !product.archived),
    [products, wishlistIds],
  )
  const total = items.reduce((sum, product) => sum + (product.deal?.dealPrice ?? product.price), 0)

  return (
    <SectionShell
      title="Wishlist"
      subtitle="Saved items are priced live from each shop — deal prices update automatically."
      action={<Badge tone="orange">{items.length} items</Badge>}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Your wishlist is empty"
          description="Tap the bookmark on a product to compare it later or buy it when it is back in stock."
          action={
            <Button size="sm" onClick={() => window.location.assign('/buyer/shops')}>
              Find products
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <p className="mt-3 border-t border-cream-3 pt-2 text-[11px] text-brown-400">
            Wishlist value at current prices: <span className="font-semibold text-brown-700">{formatINR(total)}</span>
          </p>
        </>
      )}
    </SectionShell>
  )
}

function NotificationsSection() {
  const notifications = useBuyerStore((s) => s.profile.notifications)
  const setNotifications = useBuyerStore((s) => s.setNotifications)

  const rows = [
    { key: 'orderUpdates' as const, label: 'Order updates', description: 'Shop acceptances, rider pickup and delivery status.' },
    { key: 'deals' as const, label: 'Near-expiry deals', description: 'Discounts from shops you have ordered from.' },
    { key: 'newShops' as const, label: 'New shops nearby', description: 'Tell me when a new shop starts serving my PIN code.' },
    { key: 'whatsapp' as const, label: 'WhatsApp updates', description: 'Send order updates on WhatsApp (mocked).' },
    { key: 'sms' as const, label: 'SMS updates', description: 'Fallback SMS if WhatsApp is unavailable.' },
  ]

  return (
    <SectionShell
      title="Notification preferences"
      subtitle="These switches are saved instantly in the demo. No messages are actually sent."
    >
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="border-b border-cream-2 py-3 last:border-0">
            <Toggle
              checked={notifications[row.key]}
              onChange={(value) => setNotifications({ [row.key]: value })}
              label={row.label}
              description={row.description}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] text-brown-300">
          {Object.values(notifications).filter(Boolean).length} of 5 channels enabled
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => toast('Preferences saved', 'Notification choices are stored in this browser.', 'success')}
        >
          Save preferences
        </Button>
      </div>
    </SectionShell>
  )
}

function LanguageSection() {
  const language = useBuyerStore((s) => s.profile.language)
  const setLanguage = useBuyerStore((s) => s.setLanguage)

  return (
    <SectionShell
      title="App language"
      subtitle="The demo keeps copy in English but remembers your preference for future screens."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {languageOptions.map((option) => {
          const active = language === option.code
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setLanguage(option.code)
                toast('Language preference saved', option.native, 'success')
              }}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                active
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-cream-3 bg-white/70 hover:border-brown-200',
              )}
            >
              <span>
                <span className="block text-sm font-medium text-brown-900">{option.native}</span>
                <span className="block text-[10px] text-brown-400">{option.label}</span>
              </span>
              {active ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="h-6 w-6 rounded-full border border-cream-4" />
              )}
            </button>
          )
        })}
      </div>
    </SectionShell>
  )
}

function PaymentsSection() {
  const [methods, setMethods] = useState<
    Array<{ id: string; label: string; detail: string; tone: 'success' | 'warning' | 'neutral' }>
  >([
    { id: 'upi-1', label: 'ananya@okhdfc', detail: 'UPI · primary', tone: 'success' },
    { id: 'cod', label: 'Cash on delivery', detail: 'Pay the rider at your door', tone: 'warning' },
  ])
  const [adding, setAdding] = useState(false)
  const [upi, setUpi] = useState('')

  return (
    <SectionShell
      title="Payment methods"
      subtitle="Payments are fully mocked. No card, UPI or wallet details leave this browser."
    >
      <div className="space-y-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-cream-3 bg-white/70 p-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-2 text-brown-500">
                {method.id === 'cod' ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-xs font-medium text-brown-900">{method.label}</p>
                <p className="text-[10px] text-brown-400">{method.detail}</p>
              </div>
            </div>
            <Badge tone={method.tone}>{method.id === 'cod' ? 'Available' : 'Default'}</Badge>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cream-3 pt-3">
        <p className="text-[10px] leading-relaxed text-brown-300">
          UPI payments simulate a success screen. COD orders are tracked by the rider.
        </p>
        <Button size="sm" leftIcon={Plus} onClick={() => setAdding(true)}>
          Add UPI ID
        </Button>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a demo UPI ID"
        description="Nothing is verified or charged."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!upi.includes('@') || upi.trim().length < 5) {
                  toast('Enter a valid UPI ID', 'Example: name@okbank', 'warning')
                  return
                }
                setMethods((list) => [
                  ...list,
                  { id: makeId('upi'), label: upi.trim(), detail: 'UPI · saved for demo', tone: 'neutral' },
                ])
                setUpi('')
                setAdding(false)
                toast('UPI ID added', 'Saved in demo memory for this session.', 'success')
              }}
            >
              Add payment method
            </Button>
          </>
        }
      >
        <Input
          label="UPI ID"
          placeholder="name@okbank"
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
          hint="This is never sent to a payment provider."
        />
      </Modal>
    </SectionShell>
  )
}

const faqs = [
  {
    q: 'How does a multi-shop order work?',
    a: 'Add items from multiple shops to one cart. Each shop keeps its own pickup or delivery choice, delivery fee and status. You check out once.',
  },
  {
    q: 'Can I cancel only one shop?',
    a: 'Yes. Open the order and cancel an individual shop before it starts preparing. Other shops continue normally.',
  },
  {
    q: 'Is COD available everywhere?',
    a: 'COD is shown only when every shop in the cart supports delivery and the total is below the configured limit. Pickup-only carts are prepaid.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Only in this browser using localStorage. Reset the demo any time to restore the seeded shops, orders and riders.',
  },
]

function HelpSection() {
  const [open, setOpen] = useState<number | null>(0)
  const [resetOpen, setResetOpen] = useState(false)
  const [query, setQuery] = useState('')
  const visible = faqs.filter(
    (item) =>
      !query.trim() ||
      `${item.q} ${item.a}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <SectionShell
        title="Help & support"
        subtitle="Short answers about this demo. A real support desk is not connected."
      >
        <Input
          placeholder="Search help topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />
        <div className="space-y-2">
          {visible.map((item, index) => {
            const expanded = open === index
            return (
              <div key={item.q} className="overflow-hidden rounded-xl border border-cream-3 bg-white/70">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                >
                  <span className="text-xs font-medium text-brown-800">{item.q}</span>
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 text-brown-300 transition-transform', expanded && 'rotate-180')}
                  />
                </button>
                {expanded && (
                  <p className="border-t border-cream-2 px-3.5 py-2.5 text-[11px] leading-relaxed text-brown-500">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
          {visible.length === 0 && (
            <p className="rounded-xl bg-cream-2/60 px-3 py-4 text-center text-[11px] text-brown-400">
              No help topics match “{query}”.
            </p>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => toast('Support chat is a demo', 'A real agent would reply here. No ticket was created.', 'info')}
            className="flex items-center gap-2.5 rounded-xl border border-cream-3 bg-white/70 p-3 text-left"
          >
            <LifeBuoy className="h-4 w-4 text-orange-500" />
            <span>
              <span className="block text-xs font-medium text-brown-800">Chat with support</span>
              <span className="block text-[10px] text-brown-400">Demo chat only</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => toast('Calling support', '1800 123 4567 · simulated call.', 'info')}
            className="flex items-center gap-2.5 rounded-xl border border-cream-3 bg-white/70 p-3 text-left"
          >
            <Phone className="h-4 w-4 text-orange-500" />
            <span>
              <span className="block text-xs font-medium text-brown-800">Call 1800 123 4567</span>
              <span className="block text-[10px] text-brown-400">Toll-free demo number</span>
            </span>
          </button>
        </div>
      </SectionShell>

      <Card className="border-danger/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-brown-900">
              <RotateCcw className="h-4 w-4 text-danger" /> Reset demo data
            </h2>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-brown-400">
              Clears every LocalizeIt localStorage key — profile, addresses, cart, orders, shop edits,
              rider jobs, fees, settlements and activity — then reloads the seeded demo.
            </p>
          </div>
          <Button variant="danger" size="sm" leftIcon={RotateCcw} onClick={() => setResetOpen(true)}>
            Reset everything
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-[10px] text-brown-400 sm:grid-cols-3">
          <span className="rounded-lg bg-cream-2/60 px-2.5 py-2">Orders & cart cleared</span>
          <span className="rounded-lg bg-cream-2/60 px-2.5 py-2">Shop & rider edits cleared</span>
          <span className="rounded-lg bg-cream-2/60 px-2.5 py-2">Seed data restored</span>
        </div>
      </Card>

      <DemoNote>LocalizeIt demo · no real payments, deliveries or customer data.</DemoNote>

      <ConfirmDialog
        open={resetOpen}
        title="Reset all demo data?"
        description="Every saved change in this browser will be removed. This cannot be undone."
        confirmLabel="Reset and reload"
        tone="danger"
        onClose={() => setResetOpen(false)}
        onConfirm={() => resetDemoData()}
      />
    </div>
  )
}
