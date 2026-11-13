import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  LocateFixed,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UserRound,
} from 'lucide-react'
import type { Address } from '@/types'
import { OnboardingLayout } from '@/layouts/BuyerLayout'
import { Badge, Button, Card, Checkbox, Field, Input, Select, Stepper, Toggle } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/images'
import { useBuyerStore } from '@/store/buyer'
import { useLocationStore } from '@/store/location'
import { toast } from '@/store/toast'
import { areaById, geoTree, serviceabilityLabel } from '@/data/locations'
import { languageOptions, cn } from '@/utils'

/* ─────────────────────────────── Welcome ─────────────────────────────── */

export function BuyerWelcomePage() {
  const navigate = useNavigate()
  const completeOnboarding = useBuyerStore((s) => s.completeOnboarding)

  return (
    <OnboardingLayout>
      <div className="animate-slide-up text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-700">
          <MapPin className="h-3 w-3" /> Gyanpur · Bhadohi · 221304
        </span>
        <h1 className="mt-4 font-heading text-3xl font-semibold leading-tight text-brown-900">
          Namaste! Welcome to
          <br />
          your local bazaar.
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brown-500">
          Shop from the shops you already know — kirana, dairy, sabzi, stationery and more. One cart,
          one checkout, delivery or pickup.
        </p>

        <div className="mt-6 grid gap-2.5 text-left">
          {[
            {
              icon: Store,
              title: '16 neighbourhood shops',
              text: 'Compare prices across shops in your town and nearby villages.',
              tone: 'bg-orange-100 text-orange-600',
            },
            {
              icon: ShoppingBag,
              title: 'One cart, many shops',
              text: 'Add items from different shops and pay once at checkout.',
              tone: 'bg-warning-soft text-warning',
            },
            {
              icon: Truck,
              title: 'Pickup or local delivery',
              text: 'Choose per shop — riders from your area bring it home.',
              tone: 'bg-success-soft text-success',
            },
            {
              icon: Sparkles,
              title: 'LocalizeIt AI',
              text: 'Ask in simple language — “sasta rice kahan milega?”',
              tone: 'bg-info-soft text-info',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-xl border border-cream-3 bg-white/70 p-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.tone)}>
                <item.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-brown-900">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-brown-400">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <Button size="lg" className="mt-6 w-full" rightIcon={ArrowRight} onClick={() => navigate('/buyer/login')}>
          Continue with mobile number
        </Button>
        <button
          type="button"
          onClick={() => {
            completeOnboarding()
            navigate('/buyer')
          }}
          className="mt-3 w-full text-[11px] font-medium text-brown-400 transition-colors hover:text-brown-700"
        >
          Skip and explore the demo app
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-brown-300">
          <ShieldCheck className="h-3 w-3" />
          Demo onboarding · OTP is simulated, no SMS is sent
        </p>
      </div>
    </OnboardingLayout>
  )
}

/* ─────────────────────────────── Login ─────────────────────────────── */

export function LoginPage() {
  const navigate = useNavigate()
  const profile = useBuyerStore((s) => s.profile)
  const [phone, setPhone] = useState(profile.phone || '98765 43210')
  const [accepted, setAccepted] = useState(true)
  const [error, setError] = useState('')
  const digits = phone.replace(/\D/g, '')

  const submit = () => {
    if (digits.length !== 10) {
      setError('Enter a 10-digit mobile number.')
      return
    }
    if (!accepted) {
      setError('Please accept the demo terms to continue.')
      return
    }
    setError('')
    navigate('/buyer/otp', { state: { phone } })
  }

  return (
    <OnboardingLayout>
      <Card className="animate-scale-in p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Phone className="h-5 w-5" />
          </span>
          <Badge tone="neutral">Step 1 of 4</Badge>
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Login or sign up</h1>
        <p className="mt-1 text-xs leading-relaxed text-brown-400">
          We will send a 4-digit demo OTP. Your number stays on this device only.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Mobile number" required error={error}>
            <div className="flex items-stretch gap-2">
              <span className="flex h-11 shrink-0 items-center rounded-xl border border-cream-4 bg-cream-2 px-3 text-sm font-medium text-brown-600">
                +91
              </span>
              <input
                value={phone}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^\d\s]/g, '').slice(0, 11)
                  setPhone(value)
                  setError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit()
                }}
                inputMode="numeric"
                autoFocus
                aria-label="Mobile number"
                placeholder="98765 43210"
                className="h-11 w-full rounded-xl border border-cream-4 bg-white px-3.5 text-sm tracking-wide text-brown-900 placeholder:text-brown-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </Field>

          <Checkbox
            checked={accepted}
            onChange={setAccepted}
            label={
              <span className="text-[11px] leading-relaxed">
                I agree to the demo terms and understand that no real account, payment or delivery is
                created.
              </span>
            }
          />

          <Button size="lg" className="w-full" rightIcon={ArrowRight} onClick={submit}>
            Send demo OTP
          </Button>

          <div className="rounded-xl border border-dashed border-cream-4 bg-cream-2/60 p-3 text-[10px] leading-relaxed text-brown-400">
            <span className="font-semibold text-brown-600">Demo shortcut:</span> use the prefilled number
            and OTP <span className="rounded bg-white px-1 py-0.5 font-mono font-semibold text-orange-600">1234</span>.
            Nothing leaves your browser.
          </div>

          <button
            type="button"
            onClick={() => navigate('/buyer/welcome')}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brown-400 hover:text-brown-700"
          >
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
        </div>
      </Card>
    </OnboardingLayout>
  )
}

/* ─────────────────────────────── OTP ─────────────────────────────── */

export function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useBuyerStore((s) => s.profile)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const phone = (location.state as { phone?: string } | null)?.phone ?? profile.phone

  const verify = () => {
    if (otp.replace(/\D/g, '').length !== 4) {
      setError('Enter the 4-digit OTP.')
      return
    }
    if (otp !== '1234') {
      setError('Incorrect OTP. Hint: use 1234 for the demo.')
      return
    }
    setError('')
    toast('Mobile verified', 'Welcome back — this is a simulated verification.', 'success')
    navigate(profile.onboarded ? '/buyer' : '/buyer/profile-setup')
  }

  return (
    <OnboardingLayout>
      <Card className="animate-scale-in p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <Badge tone="neutral">Step 2 of 4</Badge>
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Enter the OTP</h1>
        <p className="mt-1 text-xs text-brown-400">
          Sent to +91 {phone}. <span className="text-brown-300">(No SMS — demo only)</span>
        </p>

        <div className="mt-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-brown-600">4-digit OTP</span>
            <input
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))
                setError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') verify()
              }}
              inputMode="numeric"
              autoFocus
              aria-label="One time password"
              placeholder="••••"
              className={cn(
                'h-14 w-full rounded-xl border bg-white text-center font-heading text-2xl tracking-[0.6em] text-brown-900 placeholder:text-brown-200 focus:outline-none focus:ring-2 focus:ring-orange-100',
                error ? 'border-danger' : 'border-cream-4 focus:border-orange-400',
              )}
            />
          </label>
          {error ? (
            <p className="mt-1.5 text-[11px] text-danger">{error}</p>
          ) : (
            <p className="mt-1.5 text-[10px] text-brown-400">
              Demo OTP: <span className="font-mono font-semibold text-orange-600">1234</span>
            </p>
          )}

          <Button size="lg" className="mt-4 w-full" rightIcon={ArrowRight} onClick={verify}>
            Verify & continue
          </Button>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/buyer/login')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-brown-400 hover:text-brown-700"
            >
              <ChevronLeft className="h-3 w-3" /> Change number
            </button>
            <button
              type="button"
              onClick={() => toast('OTP resent (demo)', 'Use 1234 to continue.', 'info')}
              className="text-[11px] font-medium text-orange-600 hover:text-orange-700"
            >
              Resend OTP
            </button>
          </div>
        </div>
      </Card>
    </OnboardingLayout>
  )
}

/* ─────────────────────────────── Profile ─────────────────────────────── */

export function ProfileSetupPage() {
  const navigate = useNavigate()
  const profile = useBuyerStore((s) => s.profile)
  const updateProfile = useBuyerStore((s) => s.updateProfile)
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [language, setLanguage] = useState(profile.language)
  const [error, setError] = useState('')

  const submit = () => {
    if (name.trim().length < 2) {
      setError('Please tell us your name.')
      return
    }
    updateProfile({ name: name.trim(), email: email.trim(), language })
    navigate('/buyer/location-setup')
  }

  return (
    <OnboardingLayout>
      <Card className="animate-scale-in p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <UserRound className="h-5 w-5" />
          </span>
          <Badge tone="neutral">Step 3 of 4</Badge>
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Tell us about you</h1>
        <p className="mt-1 text-xs text-brown-400">
          Shops use this name for your orders. You can change it later in Account.
        </p>

        <div className="mt-5 space-y-4">
          <Input
            label="Full name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            placeholder="Ananya Verma"
            error={error}
          />
          <Input
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <Select
            label="Preferred language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            options={languageOptions.map((option) => ({
              value: option.code,
              label: `${option.label} · ${option.native}`,
            }))}
          />
          <div className="rounded-xl bg-cream-2/70 p-3 text-[10px] leading-relaxed text-brown-400">
            English is used for this demo. Other languages are stored as a preference and represent
            the future multilingual experience.
          </div>
          <Button size="lg" className="w-full" rightIcon={ArrowRight} onClick={submit}>
            Continue
          </Button>
        </div>
      </Card>
    </OnboardingLayout>
  )
}

/* ─────────────────────────────── Location ─────────────────────────────── */

export function LocationSetupPage() {
  const navigate = useNavigate()
  const currentAreaId = useLocationStore((s) => s.areaId)
  const setArea = useLocationStore((s) => s.setArea)
  const current = areaById(currentAreaId) ?? geoTree[0].districts[0].towns[0].areas[0]

  const [state, setState] = useState(current.state)
  const [district, setDistrict] = useState(current.district)
  const [town, setTown] = useState(current.town)
  const [areaId, setAreaId] = useState(current.id)

  const districts = useMemo(() => geoTree.find((s) => s.state === state)?.districts ?? [], [state])
  const towns = useMemo(
    () => districts.find((d) => d.district === district)?.towns ?? [],
    [districts, district],
  )
  const areas = useMemo(() => towns.find((t) => t.town === town)?.areas ?? [], [towns, town])
  const selected = areaById(areaId) ?? areas[0]

  return (
    <OnboardingLayout>
      <Card className="animate-scale-in p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <MapPin className="h-5 w-5" />
          </span>
          <Badge tone="neutral">Step 4 of 4</Badge>
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Where should we deliver?</h1>
        <p className="mt-1 text-xs text-brown-400">
          Pick your village, town or city. We show only shops that serve your PIN code.
        </p>

        <div className="mt-5 space-y-3">
          <Select
            label="State"
            value={state}
            onChange={(event) => {
              const next = event.target.value
              setState(next)
              const nextDistrict = geoTree.find((s) => s.state === next)?.districts[0]
              setDistrict(nextDistrict?.district ?? '')
              const nextTown = nextDistrict?.towns[0]
              setTown(nextTown?.town ?? '')
              setAreaId(nextTown?.areas[0]?.id ?? '')
            }}
            options={geoTree.map((item) => ({ value: item.state, label: item.state }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="District"
              value={district}
              onChange={(event) => {
                const next = event.target.value
                setDistrict(next)
                const nextTown = districts.find((d) => d.district === next)?.towns[0]
                setTown(nextTown?.town ?? '')
                setAreaId(nextTown?.areas[0]?.id ?? '')
              }}
              options={districts.map((item) => ({ value: item.district, label: item.district }))}
            />
            <Select
              label="Town / Tehsil"
              value={town}
              onChange={(event) => {
                const next = event.target.value
                setTown(next)
                setAreaId(towns.find((t) => t.town === next)?.areas[0]?.id ?? '')
              }}
              options={towns.map((item) => ({ value: item.town, label: item.town }))}
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-brown-600">Village / Locality *</p>
            <div className="grid gap-1.5">
              {areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setAreaId(area.id)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    area.id === areaId
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-cream-3 bg-white/70 hover:border-orange-200',
                  )}
                >
                  <span>
                    <span className="block text-xs font-medium text-brown-900">
                      {area.village || area.town}
                    </span>
                    <span className="text-[10px] text-brown-400">
                      {area.district}, {area.state} · PIN {area.pincode}
                    </span>
                  </span>
                  {area.serviceability === 'full' ? (
                    <Badge tone="success">Delivery</Badge>
                  ) : area.serviceability === 'pickup' ? (
                    <Badge tone="info">Pickup</Badge>
                  ) : (
                    <Badge tone="neutral">Waitlist</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed',
                selected.serviceability === 'full'
                  ? 'border-success/20 bg-success-soft text-success'
                  : selected.serviceability === 'pickup'
                    ? 'border-info/20 bg-info-soft text-info'
                    : 'border-warning/20 bg-warning-soft text-warning',
              )}
            >
              <LocateFixed className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {serviceabilityLabel[selected.serviceability]} in {selected.village || selected.town}.
                {selected.serviceability === 'full' && ` Typical delivery: ${selected.deliveryEtaMins} min.`}
              </span>
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            rightIcon={ArrowRight}
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              setArea(selected.id)
              navigate('/buyer/address-setup')
            }}
          >
            Use this location
          </Button>
          <p className="text-center text-[10px] text-brown-300">
            GPS is a demo placeholder · change location anytime from the header
          </p>
        </div>
      </Card>
    </OnboardingLayout>
  )
}

/* ─────────────────────────────── Address ─────────────────────────────── */

export function AddressSetupPage() {
  const navigate = useNavigate()
  const profile = useBuyerStore((s) => s.profile)
  const addAddress = useBuyerStore((s) => s.addAddress)
  const completeOnboarding = useBuyerStore((s) => s.completeOnboarding)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId)

  const [label, setLabel] = useState('Home')
  const [line1, setLine1] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState(area?.pincode ?? '221304')
  const [isDefault, setIsDefault] = useState(true)
  const [error, setError] = useState('')

  const submit = () => {
    if (line1.trim().length < 6) {
      setError('Please add house number, street or village lane.')
      return
    }
    const address: Address = {
      id: `addr-${Date.now().toString(36)}`,
      label,
      recipient: profile.name,
      phone: profile.phone,
      line1: line1.trim(),
      landmark: landmark.trim(),
      village: area?.village ?? '',
      town: area?.town ?? 'Gyanpur',
      district: area?.district ?? 'Bhadohi',
      state: area?.state ?? 'Uttar Pradesh',
      pincode,
      isDefault,
    }
    addAddress(address)
    completeOnboarding()
    toast('Address saved', `${label} · ${address.town}, ${address.pincode}`, 'success')
    navigate('/buyer')
  }

  return (
    <OnboardingLayout>
      <Card className="animate-scale-in p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Truck className="h-5 w-5" />
          </span>
          <Stepper steps={['Login', 'Profile', 'Location', 'Address']} current={3} />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Delivery address</h1>
        <p className="mt-1 text-xs text-brown-400">
          Riders use this address. You can add more addresses later.
        </p>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {['Home', 'Work', 'Other'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLabel(option)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                  label === option
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-cream-4 bg-white/70 text-brown-500 hover:border-orange-200',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <Input
            label="House / street / village lane"
            required
            value={line1}
            onChange={(event) => {
              setLine1(event.target.value)
              setError('')
            }}
            placeholder="12, Bazaar Road, near bus stand"
            error={error}
          />
          <Input
            label="Landmark (optional)"
            value={landmark}
            onChange={(event) => setLandmark(event.target.value)}
            placeholder="Opposite Sharma Kirana"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Town / Village">
              <div className="flex h-11 items-center rounded-xl border border-cream-4 bg-cream-2 px-3.5 text-xs text-brown-500">
                {area?.village || area?.town}
              </div>
            </Field>
            <Input
              label="PIN code"
              value={pincode}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
            />
          </div>

          <div className="rounded-xl border border-cream-3 bg-cream-2/60 p-3">
            <Toggle
              checked={isDefault}
              onChange={setIsDefault}
              label="Set as default address"
              description="Used automatically at checkout."
            />
          </div>

          <div className="flex gap-2 rounded-xl border border-dashed border-cream-4 p-3 text-[10px] leading-relaxed text-brown-400">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>
              {area?.village || area?.town} · PIN {pincode} is{' '}
              {area?.serviceability === 'full'
                ? 'fully serviceable with delivery and pickup.'
                : area?.serviceability === 'pickup'
                  ? 'pickup-only. Delivery will be disabled at checkout.'
                  : 'not serviceable yet. You can browse but not order.'}
            </span>
          </div>

          <Button size="lg" className="w-full" rightIcon={CheckCircle2} onClick={submit}>
            Save address & start shopping
          </Button>
          <button
            type="button"
            onClick={() => {
              completeOnboarding()
              navigate('/buyer')
            }}
            className="w-full text-center text-[11px] font-medium text-brown-400 hover:text-brown-700"
          >
            Skip for now — browse shops
          </button>
        </div>
      </Card>
    </OnboardingLayout>
  )
}
