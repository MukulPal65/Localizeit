import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Building2,
  CheckCircle2,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'
import { getSavedRoleSessions, useAuthStore } from '@/store/auth'
import { useBuyerStore } from '@/store/buyer'
import { resetDemoData } from '@/services/demo'
import { integrationLabels, integrationStatus } from '@/config/env'
import { retailers } from '@/config/retailers'
import { Badge, Button, Card } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/images'
import { formatINR } from '@/utils'

const roles = [
  {
    id: 'buyer',
    title: 'Buyer app',
    subtitle: 'Shop local, in one cart',
    description:
      'Find products across nearby kirana, dairy, stationery and more — compare prices and check out once.',
    bullets: ['Multi-shop cart & single checkout', 'Pickup or delivery per shop', 'LocalizeIt AI discovery'],
    icon: ShoppingBag,
    tint: 'bg-orange-100 text-orange-600',
    cta: 'Enter buyer app',
  },
  {
    id: 'shopkeeper',
    title: 'Shopkeeper dashboard',
    subtitle: 'Run your shop front',
    description:
      'Accept orders, update stock, publish near-expiry deals and track commission and payouts.',
    bullets: ['Live order queue', 'Inventory & expiry alerts', 'Sales, COD and payout view'],
    icon: Store,
    tint: 'bg-warning-soft text-warning',
    cta: 'Open shop dashboard',
  },
  {
    id: 'rider',
    title: 'Delivery partner app',
    subtitle: 'Earn from local deliveries',
    description:
      'Accept nearby jobs, follow pickup and drop instructions, and track cash-on-delivery handovers.',
    bullets: ['Job offers by distance', 'Pickup → delivered flow', 'COD & earnings tracker'],
    icon: Bike,
    tint: 'bg-success-soft text-success',
    cta: 'Open rider app',
  },
  {
    id: 'admin',
    title: 'Super admin console',
    subtitle: 'Run the ecosystem',
    description:
      'Approve shops and riders, configure fees, assign deliveries, reconcile COD and review audit logs.',
    bullets: ['Approval queues', 'Fee & commission settings', 'Settlements and reports'],
    icon: ShieldCheck,
    tint: 'bg-info-soft text-info',
    cta: 'Open admin console',
  },
] as const

export function RoleSelectPage() {
  const navigate = useNavigate()
  const startSession = useAuthStore((s) => s.startSession)
  const profile = useBuyerStore((s) => s.profile)
  const savedSessions = getSavedRoleSessions()

  const enter = (role: (typeof roles)[number]['id'], options?: { onboarding?: boolean }) => {
    if (role === 'buyer') {
      if (savedSessions.buyer) {
        startSession('buyer', savedSessions.buyer)
        navigate('/buyer')
        return
      }
      useAuthStore.getState().setRole('buyer')
      navigate(options?.onboarding || !profile.onboarded ? '/buyer/welcome' : '/buyer')
      return
    }
    if (role === 'shopkeeper') {
      if (savedSessions.shop) startSession('shopkeeper', savedSessions.shop)
      navigate(savedSessions.shop ? '/shop' : '/shop/login')
      return
    }
    if (role === 'rider') {
      if (savedSessions.rider) startSession('rider', savedSessions.rider)
      navigate(savedSessions.rider ? '/rider' : '/rider/login')
      return
    }
    if (role === 'admin') navigate(savedSessions.admin ? '/admin' : '/admin/login')
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Badge tone="orange" className="hidden sm:inline-flex">
            Frontend demo · mock data
          </Badge>
          <button
            type="button"
            onClick={resetDemoData}
            className="rounded-lg border border-cream-4 bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-brown-500 transition-colors hover:border-orange-300 hover:text-orange-600"
          >
            Reset demo data
          </button>
        </div>
      </header>

      <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-700">
            <MapPin className="h-3 w-3" />
            Built for Tier 2, Tier 3 & villages
          </span>
          <h1 className="mt-4 text-balance font-heading text-[34px] font-semibold leading-[1.08] text-brown-900 sm:text-5xl">
            Your neighbourhood,
            <br />
            <span className="relative inline-block text-orange-500">
              online.
              <svg
                className="absolute -bottom-1.5 left-0 h-2.5 w-full text-orange-300"
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path d="M2 7 Q60 1 100 5 T198 4" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-brown-500 sm:text-[15px]">
            LocalizeIt brings your village, town and city shops into one warm marketplace.
            Compare prices across shops, fill one cart, and choose pickup or local delivery for
            each shop — with neighbourhood riders earning along the way.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatChip icon={Store} value={`${retailers.shops}+`} label="local shops" />
            <StatChip icon={MapPin} value={`${retailers.areas}`} label="service areas" />
            <StatChip icon={Bike} value={`${retailers.riders}`} label="local riders" />
            <StatChip icon={Users} value={`${retailers.roles}`} label="role experiences" />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button size="lg" rightIcon={ArrowRight} onClick={() => enter('buyer')}>
              Start shopping demo
            </Button>
            <Button
              size="lg"
              variant="secondary"
              leftIcon={ShieldCheck}
              onClick={() => enter('admin')}
            >
              Explore admin
            </Button>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-cream-3 bg-white/60 p-3 text-[11px] leading-relaxed text-brown-400">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              This is a demonstration build. Orders, OTPs, payments, payouts and rider tracking are
              all simulated with realistic local mock data. Nothing is sent to real shops or
              customers.
            </span>
          </div>
        </div>

        <div className="relative animate-slide-up">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-orange-100/70 via-cream-2 to-cream-3/60" />
          <Card className="relative overflow-hidden border-cream-3/80 p-0">
            <div className="flex items-center justify-between border-b border-cream-3 bg-cream-2/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-brown-900">One cart · 3 shops</p>
                  <p className="text-[9px] text-brown-400">Agra, Uttar Pradesh · 282007</p>
                </div>
              </div>
              <Badge tone="success">Delivery available</Badge>
            </div>
            <div className="space-y-2.5 p-4">
              <MockShopRow
                name="Sharma Kirana"
                distance="0.6 km"
                items={['Basmati Rice · 1 kg', 'Tata Salt · 1 kg']}
                total={146}
                badge="Pickup"
                emoji="🌾"
              />
              <MockShopRow
                name="Gupta Dairy & Sweets"
                distance="1.1 km"
                items={['Amul Taaza Milk · 500 ml', 'Fresh Paneer · 200 g']}
                total={103}
                badge="Delivery"
                emoji="🥛"
              />
              <MockShopRow
                name="Campus Corner Pharmacy"
                distance="2.4 km"
                items={['Classmate Notebook · 200 pg']}
                total={60}
                badge="Delivery"
                emoji="✏️"
              />
            </div>
            <div className="border-t border-dashed border-cream-4 bg-cream-2/40 px-4 py-3">
              <div className="flex items-center justify-between text-[11px] text-brown-500">
                <span>Platform fee</span>
                <span className="font-medium text-success">FREE above ₹500</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-brown-500">Combined total</span>
                <span className="font-heading text-base font-semibold text-brown-900">
                  {formatINR(399)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[9px] text-orange-700">
                <Sparkles className="h-3 w-3" />
                AI found cheaper rice at a shop 200 m closer
              </div>
            </div>
          </Card>

          <div className="absolute -bottom-5 -left-3 hidden w-52 rounded-xl border border-cream-3 bg-white p-3 shadow-lift sm:block">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <p className="text-[10px] font-semibold text-brown-900">Order LZ-2402 accepted</p>
            </div>
            <p className="mt-1 pl-7.5 text-[9px] text-brown-400">
              Sharma Kirana is preparing your order.
            </p>
            <div className="mt-2 ml-2.5 flex items-center gap-1.5 border-l border-dashed border-cream-4 pl-2">
              <Package className="h-3 w-3 text-orange-500" />
              <p className="text-[9px] text-brown-500">Rider Arjun will deliver by 6:40 pm</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold text-brown-900 sm:text-2xl">
              Choose a demo experience
            </h2>
            <p className="mt-1 text-xs text-brown-400">
              Four connected dashboards. One local commerce ecosystem.
            </p>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-brown-300">
            No sign-up needed
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id} className="group relative flex flex-col overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft sm:p-5">
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${role.tint}`}>
                  <role.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-brown-900">{role.title}</h3>
                    <Badge tone="neutral">{role.subtitle}</Badge>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-brown-400">{role.description}</p>
                </div>
              </div>
              <ul className="mt-3 grid gap-1.5 pl-1 sm:grid-cols-2">
                {role.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-1.5 text-[10.5px] text-brown-500">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant={role.id === 'buyer' ? 'primary' : 'dark'}
                  size="sm"
                  rightIcon={ArrowRight}
                  onClick={() => enter(role.id)}
                  className="flex-1 sm:flex-none"
                >
                  {role.id === 'buyer' && savedSessions.buyer
                    ? `Continue as ${profile.name || 'buyer'}`
                    : role.id === 'shopkeeper' && savedSessions.shop
                      ? 'Continue as shopkeeper'
                      : role.id === 'rider' && savedSessions.rider
                        ? 'Continue as rider'
                        : role.id === 'admin' && savedSessions.admin
                          ? 'Continue as admin'
                          : role.cta}
                </Button>
                {role.id === 'buyer' && (
                  <button
                    type="button"
                    onClick={() => entersOnboarding()}
                    className="text-[10px] font-medium text-orange-600 hover:text-orange-700"
                  >
                    View onboarding flow →
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-brown-900">The demo journey</h3>
          <p className="mt-1 text-[11px] text-brown-400">
            Follow one order across all four roles — state is shared and saved locally.
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-4">
            {[
              { icon: ShoppingBag, title: 'Buyer', text: 'Cart across shops & place demo order' },
              { icon: Store, title: 'Shop', text: 'Accept, prepare, mark ready' },
              { icon: Bike, title: 'Rider', text: 'Accept job, pick up, deliver' },
              { icon: ShieldCheck, title: 'Admin', text: 'Track orders, COD & audit trail' },
            ].map((step, index) => (
              <li key={step.title} className="relative rounded-xl border border-cream-3 bg-cream-2/50 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-orange-500 shadow-sm">
                  <step.icon className="h-3.5 w-3.5" />
                </span>
                <p className="mt-2 text-[11px] font-semibold text-brown-900">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-brown-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-brown-900">Integration status</h3>
          <p className="mt-1 text-[11px] text-brown-400">
            The frontend is wired for these services but runs entirely on mock data today.
          </p>
          <ul className="mt-3 space-y-1.5">
            {(Object.keys(integrationStatus) as Array<keyof typeof integrationStatus>).map((key) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-lg border border-cream-3 bg-white/60 px-2.5 py-2"
              >
                <span className="flex items-center gap-1.5 text-[11px] text-brown-600">
                  <Building2 className="h-3 w-3 text-brown-300" />
                  {integrationLabels[key]}
                </span>
                <Badge tone={integrationStatus[key] ? 'success' : 'neutral'}>
                  {integrationStatus[key] ? 'Connected' : 'Mock mode'}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[9px] leading-relaxed text-brown-300">
            Configure keys in <code className="rounded bg-cream-2 px-1 py-0.5">.env</code>. Without
            them, the app stays in demo mode by design.
          </p>
        </Card>
      </section>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-cream-3 pt-4 text-[10px] text-brown-300">
        <p>LocalizeIt · Hyperlocal commerce for Bharat · Frontend demo build</p>
        <p>Made with mock data · ₹ formatting in Indian locale</p>
      </footer>
    </div>
  )

  function entersOnboarding() {
    useAuthStore.getState().setRole('buyer')
    navigate('/buyer/welcome')
  }
}

function StatChip({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Store
  value: string
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cream-4 bg-white/70 px-2.5 py-1 text-[10px] text-brown-500">
      <Icon className="h-3 w-3 text-orange-500" />
      <span className="font-semibold text-brown-800">{value}</span>
      {label}
    </span>
  )
}

function MockShopRow({
  name,
  distance,
  items,
  total,
  badge,
  emoji,
}: {
  name: string
  distance: string
  items: string[]
  total: number
  badge: string
  emoji: string
}) {
  return (
    <div className="rounded-xl border border-cream-3 bg-white/70 p-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-2 text-base">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-brown-900">{name}</p>
          <p className="text-[9px] text-brown-400">{distance} away</p>
        </div>
        <Badge tone={badge === 'Pickup' ? 'info' : 'success'}>{badge}</Badge>
      </div>
      <div className="mt-2 space-y-0.5">
        {items.map((item) => (
          <p key={item} className="text-[10px] text-brown-500">
            • {item}
          </p>
        ))}
      </div>
      <div className="mt-1.5 flex justify-end">
        <span className="text-[10px] font-semibold text-brown-800">{formatINR(total)}</span>
      </div>
    </div>
  )
}
