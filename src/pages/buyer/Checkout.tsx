import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  MapPin,
  PackageCheck,
  Plus,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react'
import type { Address, PaymentMethod } from '@/types'
import { areaById, serviceabilityLabel } from '@/data/locations'
import { cartToGroups, isCodEligibleForOrder } from '@/services/feeService'
import { placeOrder } from '@/services/workflow'
import { useBuyerStore } from '@/store/buyer'
import { useCartStore } from '@/store/cart'
import { useFeeStore } from '@/store/fees'
import { useLocationStore } from '@/store/location'
import { toast } from '@/store/toast'
import { useCartSummary } from '@/hooks/useCartSummary'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Stepper,
} from '@/components/ui/primitives'
import {
  TotalBar,
} from '@/components/shared/Misc'
import { cn, formatINR, makeId } from '@/utils'

const steps = ['Address', 'Payment', 'Review']

export function CheckoutPage() {
  const navigate = useNavigate()
  const { quote, itemCount } = useCartSummary()
  const profile = useBuyerStore((s) => s.profile)
  const addAddress = useBuyerStore((s) => s.addAddress)
  const setDefaultAddress = useBuyerStore((s) => s.setDefaultAddress)
  const config = useFeeStore((s) => s.config)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById('area-gyanpur')!
  const groups = useCartStore((s) => s.groups)

  const defaultAddress = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0]
  const [step, setStep] = useState(0)
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? '')
  const [payment, setPayment] = useState<PaymentMethod>('upi')
  const [note, setNote] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!addressId && defaultAddress) setAddressId(defaultAddress.id)
  }, [addressId, defaultAddress])

  const selectedAddress = profile.addresses.find((a) => a.id === addressId) ?? defaultAddress
  const fulfilments = quote.groups.map((group) => group.fulfilment)
  const codEligible = isCodEligibleForOrder(fulfilments, quote.breakdown.grandTotal, config)
  const hasPickup = fulfilments.includes('pickup')

  const orderedGroups = useMemo(
    () => cartToGroups(groups).length,
    [groups],
  )

  if (!orderedGroups || quote.groups.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Checkout" backTo={() => navigate('/buyer/cart')} />
        <Card>
          <EmptyState
            icon={PackageCheck}
            title="Nothing to check out"
            description="Add items from one or more nearby shops and come back here."
            action={
              <Button size="sm" onClick={() => navigate('/buyer/shops')}>
                Browse shops
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const goNext = () => {
    if (step === 0 && !selectedAddress) {
      toast('Add a delivery address', 'A demo address is needed for pickup and delivery records.', 'error')
      return
    }
    if (step === 1 && payment === 'cod' && !codEligible) {
      toast('COD unavailable', 'Choose UPI or remove the pickup-only shop from the cart.', 'error')
      return
    }
    setStep((current) => Math.min(2, current + 1))
  }

  const submit = () => {
    setPlacing(true)
    const result = placeOrder({ addressId: selectedAddress?.id, paymentMethod: payment, note: note.trim() || undefined })
    setPlacing(false)
    if (!result.ok || !result.orderId) {
      toast('Order not placed', result.error ?? 'Please review your cart and try again.', 'error')
      return
    }
    navigate(`/buyer/orders/${result.orderId}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Checkout"
        subtitle={`${itemCount} items from ${quote.groups.length} shop${quote.groups.length === 1 ? '' : 's'} · one demo payment`}
        backTo={() => navigate('/buyer/cart')}
        action={<Badge tone="warning">Mock checkout</Badge>}
      />

      <Card className="p-3.5">
        <Stepper
          steps={steps}
          current={step}
          onStepClick={(index) => {
            if (index <= step) setStep(index)
          }}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {step === 0 && (
            <Card>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-brown-900">Delivery & pickup details</h2>
                  <p className="mt-0.5 text-[11px] text-brown-400">
                    Current service area: {area.village || area.town} · {serviceabilityLabel[area.serviceability]}
                  </p>
                </div>
                <Button size="sm" variant="secondary" leftIcon={Plus} onClick={() => setAddOpen(true)}>
                  Add address
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {profile.addresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => {
                      setAddressId(address.id)
                      if (!address.isDefault) setDefaultAddress(address.id)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                      addressId === address.id
                        ? 'border-orange-300 bg-orange-50/70'
                        : 'border-cream-3 bg-white/60 hover:border-orange-200',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        addressId === address.id ? 'border-orange-500 bg-orange-500 text-white' : 'border-cream-4 bg-white',
                      )}
                    >
                      {addressId === address.id && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-brown-900">{address.label}</span>
                        {address.isDefault && <Badge tone="neutral">Default</Badge>}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-brown-500">
                        {address.line1}
                        {address.landmark ? `, ${address.landmark}` : ''}
                        {address.village ? `, ${address.village}` : ''}, {address.town}, {address.district} —{' '}
                        {address.pincode}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-brown-400">
                        {address.recipient} · {address.phone}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {hasPickup && (
                <div className="mt-3 rounded-xl border border-info/20 bg-info-soft/60 p-2.5 text-[10.5px] leading-relaxed text-info">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  Some shops will be self-pickup. Their counter address is shown on the order and in your
                  timeline.
                </div>
              )}
            </Card>
          )}

          {step === 1 && (
            <Card>
              <h2 className="text-base font-semibold text-brown-900">Payment method</h2>
              <p className="mt-0.5 text-[11px] text-brown-400">Demo only — no Razorpay order or real money movement.</p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setPayment('upi')}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                    payment === 'upi' ? 'border-orange-300 bg-orange-50/70' : 'border-cream-3 bg-white/60',
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-brown-900">UPI or card · mock</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-brown-400">
                      Simulates a successful prepaid payment. Use this option for pickup-only shops.
                    </span>
                  </span>
                  {payment === 'upi' && <Check className="h-4 w-4 shrink-0 text-orange-500" />}
                </button>
                <button
                  type="button"
                  disabled={!codEligible}
                  onClick={() => setPayment('cod')}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    payment === 'cod' ? 'border-orange-300 bg-orange-50/70' : 'border-cream-3 bg-white/60',
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
                    <Banknote className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-brown-900">Cash on delivery</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-brown-400">
                      {codEligible
                        ? `Pay ${formatINR(quote.breakdown.grandTotal)} in cash. Max order ${formatINR(config.codMaxAmount)}.`
                        : hasPickup
                          ? 'Not available when a shop is self-pickup. Choose UPI.'
                          : !config.codEnabled
                            ? 'COD is disabled in the demo fee settings.'
                            : 'This order exceeds the demo COD limit.'}
                    </span>
                  </span>
                  {payment === 'cod' && <Check className="h-4 w-4 shrink-0 text-orange-500" />}
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-cream-3 bg-cream-2/40 p-2.5 text-[10px] leading-relaxed text-brown-400">
                  <CreditCard className="mr-1 inline h-3 w-3" />
                  Platform fee {config.platformFee === 0 ? 'is free' : formatINR(config.platformFee)} under{' '}
                  {formatINR(config.freeFeeAbove)}; free above that in the demo rules.
                </div>
                <div className="rounded-xl border border-cream-3 bg-cream-2/40 p-2.5 text-[10px] leading-relaxed text-brown-400">
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  Real integrations are disabled. Keys live in <code>.env</code> for the future.
                </div>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-medium text-brown-600">Delivery note (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Landmark, gate instructions or a note for the rider…"
                  className="mt-1 min-h-20 w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900 placeholder:text-brown-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </label>
            </Card>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Card>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-brown-900">Review your order</h2>
                  <Badge tone="success">Ready to place</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {quote.groups.map((group) => (
                    <div key={group.shopId} className="rounded-xl border border-cream-3 bg-cream-2/30 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <p className="text-xs font-semibold text-brown-900">{group.shop.name}</p>
                        {group.fulfilment === 'pickup' ? (
                          <Badge tone="info">Pickup</Badge>
                        ) : (
                          <Badge tone="success">Delivery</Badge>
                        )}
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {group.items.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="truncate text-brown-600">
                              {item.name} <span className="text-brown-300">× {item.qty}</span>
                            </span>
                            <span className="shrink-0 text-brown-700">{formatINR(item.price * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-cream-4 pt-1.5 text-[10px] text-brown-400">
                        <span>
                          {group.fulfilment === 'pickup'
                            ? `Collect from ${group.shop.address}`
                            : `Deliver to ${selectedAddress?.label ?? 'your address'}`}
                        </span>
                        <span>{group.deliveryFee === 0 ? 'No delivery fee' : formatINR(group.deliveryFee)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-brown-900">Address & payment</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-cream-2/50 p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-brown-300">Deliver / collect with</p>
                    <p className="mt-0.5 text-[11px] font-medium text-brown-800">{selectedAddress?.label}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-brown-400">
                      {selectedAddress?.line1}, {selectedAddress?.town} — {selectedAddress?.pincode}
                    </p>
                  </div>
                  <div className="rounded-xl bg-cream-2/50 p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-brown-300">Payment</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brown-800">
                      {payment === 'cod' ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                      {payment === 'cod' ? 'Cash on delivery' : 'UPI (mock)'}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-brown-400">
                      {payment === 'cod'
                        ? `Keep ${formatINR(quote.breakdown.grandTotal)} ready for the rider.`
                        : 'No real payment request is created.'}
                    </p>
                  </div>
                </div>
                {note.trim() && (
                  <p className="mt-2 rounded-lg bg-orange-50 px-2.5 py-2 text-[10px] text-orange-700">Note: {note}</p>
                )}
              </Card>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              Back
            </Button>
            {step < 2 ? (
              <Button size="sm" rightIcon={ChevronRight} onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button size="sm" loading={placing} rightIcon={ChevronRight} onClick={submit}>
                Place demo order · {formatINR(quote.breakdown.grandTotal)}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <h2 className="text-base font-semibold text-brown-900">Bill summary</h2>
            <div className="mt-3">
              <TotalBar
                itemSubtotal={quote.breakdown.itemSubtotal}
                platformFee={quote.breakdown.platformFee}
                deliveryTotal={quote.breakdown.deliveryTotal}
                dealSavings={quote.dealSavings}
                grandTotal={quote.breakdown.grandTotal}
                codAmount={payment === 'cod' ? quote.breakdown.grandTotal : 0}
              />
            </div>
          </Card>
          <Card className="p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brown-900">
              <Truck className="h-3.5 w-3.5 text-success" /> What happens next
            </p>
            <ol className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-brown-400">
              <li>1. Each shop receives its own order and can accept or reject.</li>
              <li>2. Delivery shops hand over to a local rider; pickup shops mark ready.</li>
              <li>3. You track each shop independently from the order page.</li>
            </ol>
            <Link to="/buyer/cart" className="mt-2 inline-block text-[10px] font-medium text-orange-600">
              Edit cart items
            </Link>
          </Card>
        </div>
      </div>

      <AddAddressModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(address) => {
          addAddress(address)
          setAddressId(address.id)
          setAddOpen(false)
          toast('Address added', 'Selected for this demo checkout.', 'success')
        }}
        name={profile.name}
        phone={profile.phone}
        defaultArea={area}
      />
    </div>
  )
}

function AddAddressModal({
  open,
  onClose,
  onSave,
  name,
  phone,
  defaultArea,
}: {
  open: boolean
  onClose: () => void
  onSave: (address: Address) => void
  name: string
  phone: string
  defaultArea: { state: string; district: string; town: string; village: string; pincode: string }
}) {
  const [label, setLabel] = useState('Home')
  const [line1, setLine1] = useState('')
  const [landmark, setLandmark] = useState('')
  const [village, setVillage] = useState(defaultArea.village)
  const [town, setTown] = useState(defaultArea.town)
  const [pincode, setPincode] = useState(defaultArea.pincode)

  const reset = () => {
    setLabel('Home')
    setLine1('')
    setLandmark('')
    setVillage(defaultArea.village)
    setTown(defaultArea.town)
    setPincode(defaultArea.pincode)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a demo address"
      description="Saved locally in your browser. No real address verification is performed."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!line1.trim()) {
                toast('Address line required', 'Add a house or street detail for the demo order.', 'error')
                return
              }
              onSave({
                id: makeId('addr'),
                label: label.trim() || 'Address',
                recipient: name,
                phone,
                line1: line1.trim(),
                landmark: landmark.trim(),
                village: village.trim(),
                town: town.trim() || defaultArea.town,
                district: defaultArea.district,
                state: defaultArea.state,
                pincode: pincode.trim() || defaultArea.pincode,
                isDefault: false,
              })
              reset()
            }}
          >
            Save address
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input label="Label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Home, Shop, Hostel" />
          <Input label="PIN code" value={pincode} onChange={(event) => setPincode(event.target.value)} />
        </div>
        <Input
          label="House / street / area"
          required
          value={line1}
          onChange={(event) => setLine1(event.target.value)}
          placeholder="12, Bazaar Road"
        />
        <Input
          label="Landmark"
          value={landmark}
          onChange={(event) => setLandmark(event.target.value)}
          placeholder="Opposite Sharma Kirana"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input label="Village (optional)" value={village} onChange={(event) => setVillage(event.target.value)} />
          <Input label="Town / city" value={town} onChange={(event) => setTown(event.target.value)} />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-cream-2/60 p-2.5 text-[10px] leading-relaxed text-brown-400">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          {town}, {defaultArea.district}, {defaultArea.state}. Serviceability is checked against your
          selected location after saving.
        </div>
      </div>
    </Modal>
  )
}
