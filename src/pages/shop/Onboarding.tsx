import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Headphones,
  Hourglass,
  IdCard,
  Landmark,
  RotateCcw,
  Send,
  ShieldCheck,
  Store,
  Truck,
  Upload,
  XCircle,
} from 'lucide-react'
import type { Shop } from '@/types'
import { categories } from '@/data/categories'
import { applyShopApplication } from '@/services/workflow'
import { useActivityStore } from '@/store/activity'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { toast } from '@/store/toast'
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from '@/components/ui/primitives'
import { ShopAvatar } from '@/components/ui/images'
import { DemoNote, InfoBanner, KeyValue } from '@/components/shared/dashboard'
import { cn, formatDate, shopStatusMeta, timeAgo } from '@/utils'

type StepState = 'done' | 'current' | 'todo' | 'error'

const rejectedDocsNote =
  'The uploaded document was blurry. Please upload a clear photo or PDF of the original.'

export function ShopOnboardingPage() {
  const shopId = useAuthStore((s) => s.shopId)
  const shops = useCatalogStore((s) => s.shops)
  const shop = shops.find((item) => item.id === shopId)
  const log = useActivityStore((s) => s.log)

  const [resubmitOpen, setResubmitOpen] = useState(false)
  const [replaceDoc, setReplaceDoc] = useState<string | null>(null)

  if (!shop) {
    return (
      <Card>
        <p className="text-sm text-brown-500">Shop not found. Reset the demo to restore the seeded shop.</p>
      </Card>
    )
  }

  const status = shopStatusMeta[shop.status]
  const isRejected = shop.status === 'rejected'
  const isPending = shop.status === 'pending'
  const isSuspended = shop.status === 'suspended'
  const isApproved = shop.status === 'approved'

  const timeline: Array<{ label: string; description: string; state: StepState; at?: string }> = [
    {
      label: 'Application submitted',
      description: `${shop.ownerName} submitted shop details for ${shop.town}.`,
      state: 'done',
      at: `${shop.since ? '' : ''}${formatDate(new Date(Date.now() - 86_400_000 * 6).toISOString())}`,
    },
    {
      label: 'Documents verified',
      description: isRejected
        ? 'One document needs a clearer copy.'
        : isPending
          ? 'Mock verification is in progress. Usually takes a few minutes.'
          : 'ID proof, shop proof and bank details were accepted.',
      state: isRejected ? 'error' : isApproved || isSuspended ? 'done' : 'current',
    },
    {
      label: 'Shop visit / call',
      description: 'A local ops partner checks the shop name board and counter.',
      state: isApproved || isSuspended ? 'done' : isRejected ? 'todo' : 'todo',
    },
    {
      label: 'Shop live on LocalizeIt',
      description: isSuspended
        ? 'Listing is paused while the review is open.'
        : 'Buyers in your service PIN codes can order.',
      state: isApproved ? 'done' : isSuspended ? 'error' : 'todo',
    },
  ]

  const docs = [
    {
      id: 'aadhaar',
      name: 'Owner ID proof',
      file: 'aadhaar-rakesh-sharma.pdf',
      icon: IdCard,
      state: isRejected ? ('rejected' as const) : ('verified' as const),
      note: isRejected ? rejectedDocsNote : 'Aadhaar matched with the owner name.',
    },
    {
      id: 'shop',
      name: 'Shop registration',
      file: 'udyam-registration.pdf',
      icon: FileText,
      state: isRejected ? ('rejected' as const) : ('verified' as const),
      note: isRejected ? 'Udyam number was unreadable in the scan.' : 'Udyam number verified against the shop name.',
    },
    {
      id: 'bank',
      name: 'Bank account',
      file: 'sbi-cancelled-cheque.jpg',
      icon: Landmark,
      state: 'verified' as const,
      note: 'Payouts settle to A/C •••• 4821 (demo).',
    },
    {
      id: 'fssai',
      name: 'FSSAI licence',
      file: 'fssai-licence.pdf',
      icon: ShieldCheck,
      state: shop.categoryId === 'kirana' || shop.categoryId === 'dairy' || shop.categoryId === 'bakery'
        ? ('verified' as const)
        : ('optional' as const),
      note:
        shop.categoryId === 'kirana' || shop.categoryId === 'dairy' || shop.categoryId === 'bakery'
          ? 'Needed for food items. Valid until Dec 2027.'
          : 'Not required for your current category.',
    },
  ]

  const completeCount = timeline.filter((step) => step.state === 'done').length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Onboarding & KYC"
        subtitle="Your shop application, demo documents and the steps before buyers can order."
        action={
          isApproved ? (
            <Link to="/shop/profile">
              <Button size="sm" variant="secondary" leftIcon={Store}>
                Edit shop details
              </Button>
            </Link>
          ) : (
            <Button size="sm" leftIcon={Send} onClick={() => setResubmitOpen(true)}>
              {isRejected ? 'Resubmit application' : 'Update application'}
            </Button>
          )
        }
      />

      <Card className={cn('overflow-hidden p-0', isRejected && 'border-danger/25', isSuspended && 'border-warning/25')}>
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 border-b border-cream-3 px-4 py-4 sm:px-5',
            isApproved
              ? 'bg-success-soft/40'
              : isRejected
                ? 'bg-danger-soft/30'
                : isSuspended
                  ? 'bg-warning-soft/40'
                  : 'bg-orange-50/60',
          )}
        >
          <div className="flex items-center gap-3">
            <ShopAvatar name={shop.name} tint={shop.tint} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-heading text-base font-semibold text-brown-900">{shop.name}</h2>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', status.tone)}>
                  {status.label}
                </span>
              </div>
              <p className="text-[11px] text-brown-400">
                {shop.ownerName} · {shop.categoryName} · {shop.town}, {shop.district}
              </p>
              <p className="mt-0.5 text-[10px] text-brown-400">
                Application ID <span className="font-mono text-brown-600">SHOP-{shop.id.toUpperCase()}-2026</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-brown-400">Verification</p>
              <p className="font-heading text-lg font-semibold text-brown-900">{completeCount}/4 steps</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
              {isApproved ? (
                <BadgeCheck className="h-5 w-5 text-success" />
              ) : isRejected ? (
                <XCircle className="h-5 w-5 text-danger" />
              ) : isSuspended ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <Hourglass className="h-5 w-5 text-orange-500" />
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          {isRejected && (
            <div className="rounded-xl border border-danger/20 bg-danger-soft/40 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                <XCircle className="h-3.5 w-3.5" /> Application needs changes
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-brown-500">
                “{shop.rejectionReason ?? 'Please update your details and upload clear documents.'}”
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="danger" leftIcon={RotateCcw} onClick={() => setResubmitOpen(true)}>
                  Fix and resubmit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={Headphones}
                  onClick={() => toast('Support is a demo', 'A real ops agent would call you. No ticket was created.', 'info')}
                >
                  Talk to support
                </Button>
              </div>
            </div>
          )}

          {isPending && (
            <div className="rounded-xl border border-warning/20 bg-warning-soft/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                <Clock className="h-3.5 w-3.5" /> Under review
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-brown-500">
                You can keep adding products and preparing your catalogue. The demo admin approves shops from
                Admin → Shops. Until then, your shop stays hidden from buyers.
              </p>
            </div>
          )}

          {isSuspended && (
            <div className="rounded-xl border border-warning/20 bg-warning-soft/40 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Listing paused
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-brown-500">
                New orders are paused while the demo admin reviews your shop. Update your details and resubmit to
                request reinstatement.
              </p>
            </div>
          )}

          {isApproved && (
            <div className="rounded-xl border border-success/20 bg-success-soft/40 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> You are live
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-brown-500">
                Buyers in {shop.servicePins.join(', ') || 'your PIN codes'} can see your shop and place orders.
                Keep stock and prep times updated to stay highly rated.
              </p>
            </div>
          )}

          <ol className="mt-4 space-y-0">
            {timeline.map((step, index) => {
              const isLast = index === timeline.length - 1
              const styles: Record<StepState, string> = {
                done: 'border-success/30 bg-success text-white',
                current: 'border-orange-500 bg-orange-500 text-white',
                todo: 'border-cream-3 bg-cream-2 text-brown-300',
                error: 'border-danger/30 bg-danger text-white',
              }
              return (
                <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                  {!isLast && (
                    <span
                      className={cn(
                        'absolute left-[11px] top-6 h-[calc(100%-18px)] w-px',
                        step.state === 'done' ? 'bg-success/40' : 'bg-cream-3',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-[1] mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border-2',
                      styles[step.state],
                    )}
                  >
                    {step.state === 'done' ? (
                      <Check className="h-3 w-3" />
                    ) : step.state === 'error' ? (
                      <XCircle className="h-3 w-3" />
                    ) : step.state === 'current' ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-current" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p
                        className={cn(
                          'text-xs font-semibold',
                          step.state === 'todo' ? 'text-brown-300' : 'text-brown-800',
                        )}
                      >
                        {step.label}
                      </p>
                      {step.at && <span className="text-[10px] text-brown-300">{step.at}</span>}
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-brown-400">{step.description}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-semibold text-brown-900">KYC documents</h2>
              <p className="text-[11px] text-brown-400">Demo files only — nothing is uploaded to a server.</p>
            </div>
            <Badge tone={isRejected ? 'danger' : 'success'}>
              {isRejected ? 'Action needed' : 'On file'}
            </Badge>
          </div>

          <div className="space-y-2">
            {docs.map((doc) => {
              const Icon = doc.icon
              const tone =
                doc.state === 'verified'
                  ? 'text-success'
                  : doc.state === 'rejected'
                    ? 'text-danger'
                    : 'text-brown-300'
              return (
                <div
                  key={doc.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-xl border p-3',
                    doc.state === 'rejected'
                      ? 'border-danger/25 bg-danger-soft/25'
                      : 'border-cream-3 bg-white/70',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-2">
                    <Icon className={cn('h-4 w-4', tone)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-brown-900">{doc.name}</p>
                    <p className="truncate text-[10px] text-brown-400">{doc.file}</p>
                    <p className={cn('mt-0.5 text-[10px] leading-relaxed', doc.state === 'rejected' ? 'text-danger' : 'text-brown-400')}>
                      {doc.note}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.state === 'verified' && <Badge tone="success">Verified</Badge>}
                    {doc.state === 'rejected' && <Badge tone="danger">Rejected</Badge>}
                    {doc.state === 'optional' && <Badge tone="neutral">Not needed</Badge>}
                    {doc.state !== 'optional' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Upload}
                        onClick={() => setReplaceDoc(doc.name)}
                      >
                        Replace
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-cream-2/60 p-2.5 text-[10px] leading-relaxed text-brown-400">
            <FileCheck2 className="mt-0.5 h-3 w-3 shrink-0" />
            Accepted formats: PDF, JPG or PNG up to 5 MB. Do not upload real identity documents — the demo
            keeps a filename only.
          </p>
        </Card>

        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brown-900">Shop summary</h2>
              <Badge tone="neutral">Demo</Badge>
            </div>
            <div className="mt-3 space-y-1.5">
              <KeyValue label="Owner">{shop.ownerName}</KeyValue>
              <KeyValue label="Phone">{shop.phone}</KeyValue>
              <KeyValue label="Category">{shop.categoryName}</KeyValue>
              <KeyValue label="Location">
                {[shop.village, shop.town].filter(Boolean).join(', ')}
              </KeyValue>
              <KeyValue label="Service PINs">{shop.servicePins.join(', ') || 'None'}</KeyValue>
              <KeyValue label="Fulfilment">
                {[shop.pickup ? 'Pickup' : '', shop.delivery ? 'Delivery' : ''].filter(Boolean).join(' · ') || 'None'}
              </KeyValue>
              <KeyValue label="Commission">{shop.commissionPct}%</KeyValue>
              <KeyValue label="Status">{status.label}</KeyValue>
            </div>
            <Link to="/shop/profile" className="mt-3 block">
              <Button variant="secondary" size="sm" className="w-full" leftIcon={Building2}>
                Edit business details
              </Button>
            </Link>
          </Card>

          <Card>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brown-900">
              <Truck className="h-4 w-4 text-orange-500" /> What unlocks after approval
            </h2>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-brown-500">
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> Shop appears in buyer search and category pages
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> Buyers can add products to a multi-shop cart
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> Delivery jobs appear in the rider pool
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> Weekly demo settlements start accruing
              </li>
            </ul>
            <div className="mt-3 rounded-lg bg-cream-2/60 p-2.5 text-[10px] leading-relaxed text-brown-400">
              <p className="font-medium text-brown-600">Average demo review time</p>
              <p>4 – 6 minutes after resubmission. The admin can approve instantly.</p>
            </div>
          </Card>

          <InfoBanner tone="info" title="This is a sandbox">
            Use the Admin demo role to approve, reject or suspend this shop and watch the buyer and shopkeeper
            screens update.
          </InfoBanner>

          <DemoNote>KYC documents and verification steps are simulated.</DemoNote>
        </div>
      </div>

      <ResubmitModal open={resubmitOpen} shop={shop} onClose={() => setResubmitOpen(false)} log={log} />

      <Modal
        open={Boolean(replaceDoc)}
        onClose={() => setReplaceDoc(null)}
        title={`Replace ${replaceDoc ?? 'document'}`}
        description="A filename is all the demo stores. No file leaves this browser."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReplaceDoc(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              leftIcon={Upload}
              onClick={() => {
                toast('Demo document updated', `${replaceDoc ?? 'Document'} was replaced (mock).`, 'success')
                setReplaceDoc(null)
              }}
            >
              Use demo file
            </Button>
          </>
        }
      >
        <div className="rounded-xl border-2 border-dashed border-cream-4 bg-cream-2/40 px-4 py-8 text-center">
          <Upload className="mx-auto h-6 w-6 text-brown-300" />
          <p className="mt-2 text-xs font-medium text-brown-600">Drop a PDF or image here</p>
          <p className="mt-0.5 text-[10px] text-brown-300">Demo mode uses a sample file instead.</p>
        </div>
      </Modal>
    </div>
  )
}

function ResubmitModal({
  open,
  shop,
  onClose,
  log,
}: {
  open: boolean
  shop: Shop
  onClose: () => void
  log: ReturnType<typeof useActivityStore.getState>['log']
}) {
  const [draft, setDraft] = useState({
    name: shop.name,
    ownerName: shop.ownerName,
    phone: shop.phone,
    categoryId: shop.categoryId,
    address: shop.address,
    village: shop.village,
    town: shop.town,
    district: shop.district,
    state: shop.state,
    pincode: shop.pincode,
    pickup: shop.pickup,
    delivery: shop.delivery,
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    if (!draft.name.trim() || !draft.ownerName.trim() || draft.pincode.length !== 6) {
      toast('Complete the required fields', 'Shop name, owner and a 6-digit PIN code are required.', 'warning')
      return
    }
    if (!draft.pickup && !draft.delivery) {
      toast('Choose a fulfilment mode', 'Enable pickup, delivery or both.', 'warning')
      return
    }
    setSubmitting(true)
    const category = categories.find((item) => item.id === draft.categoryId)
    applyShopApplication({
      name: draft.name.trim(),
      ownerName: draft.ownerName.trim(),
      phone: draft.phone.trim(),
      categoryId: draft.categoryId,
      categoryName: category?.name ?? shop.categoryName,
      address: draft.address.trim(),
      village: draft.village.trim(),
      town: draft.town.trim(),
      district: draft.district.trim(),
      state: draft.state.trim(),
      pincode: draft.pincode,
      pickup: draft.pickup,
      delivery: draft.delivery,
    })
    if (draft.note.trim()) {
      log({
        actor: draft.ownerName.trim(),
        role: 'shopkeeper',
        action: 'Resubmission note added',
        targetType: 'shop',
        targetLabel: shop.id,
        description: draft.note.trim(),
      })
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={shop.status === 'rejected' ? 'Fix and resubmit' : 'Update shop application'}
      description="Resubmitting sets the shop back to pending review in the demo."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" leftIcon={Send} onClick={submit} loading={submitting}>
            Submit for review
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Shop name"
          required
          className="sm:col-span-2"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <Input
          label="Owner name"
          required
          value={draft.ownerName}
          onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })}
        />
        <Input
          label="Phone"
          value={draft.phone}
          onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
        />
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
          label="PIN code"
          required
          inputMode="numeric"
          maxLength={6}
          value={draft.pincode}
          onChange={(event) => setDraft({ ...draft, pincode: event.target.value.replace(/\D/g, '') })}
        />
        <Textarea
          label="Shop address"
          rows={2}
          className="sm:col-span-2"
          value={draft.address}
          onChange={(event) => setDraft({ ...draft, address: event.target.value })}
        />
        <Input
          label="Village / area"
          value={draft.village}
          onChange={(event) => setDraft({ ...draft, village: event.target.value })}
        />
        <Input
          label="Town"
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
        <div className="rounded-xl border border-cream-3 bg-white/70 p-3 sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-brown-600">Fulfilment</p>
          <div className="space-y-2">
            <Toggle
              checked={draft.pickup}
              onChange={(value) => setDraft({ ...draft, pickup: value })}
              label="Self pickup"
            />
            <Toggle
              checked={draft.delivery}
              onChange={(value) => setDraft({ ...draft, delivery: value })}
              label="Home delivery"
            />
          </div>
        </div>
        <Textarea
          label="Note for the review team"
          rows={3}
          className="sm:col-span-2"
          placeholder="Anything the demo admin should know about your updated documents."
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
        />
        <p className="rounded-lg bg-cream-2/70 p-2.5 text-[10px] leading-relaxed text-brown-400 sm:col-span-2">
          Last status update {timeAgo(new Date(Date.now() - 3 * 3_600_000).toISOString())} · Demo review is not a
          legal verification.
        </p>
      </div>
    </Modal>
  )
}
