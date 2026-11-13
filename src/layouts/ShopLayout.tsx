import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BadgePercent,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Rocket,
  Store,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/utils'
import { Logo, ShopAvatar } from '@/components/ui/images'
import { Badge, Button } from '@/components/ui/primitives'
import { shopStatusMeta } from '@/utils'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { useOrderStore } from '@/store/orders'
import { statusCounts } from '@/services/orderService'
import { resetDemoData } from '@/services/demo'

const navItems = [
  { to: '/shop', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/shop/orders', label: 'Orders', icon: ClipboardList },
  { to: '/shop/products', label: 'Products', icon: Package },
  { to: '/shop/inventory', label: 'Inventory', icon: Boxes },
  { to: '/shop/sales', label: 'Sales & payouts', icon: TrendingUp },
  { to: '/shop/deals', label: 'Near-expiry deals', icon: BadgePercent },
  { to: '/shop/profile', label: 'Shop profile', icon: Store },
]

const mobileNav = navItems.slice(0, 4)

export function ShopLayout() {
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const shopId = useAuthStore((s) => s.shopId)
  const signOut = useAuthStore((s) => s.signOut)
  const shop = useCatalogStore((s) => s.shops.find((item) => item.id === shopId))
  const orders = useOrderStore((s) => s.orders)
  const counts = statusCounts(orders, shopId)

  if (!shop) return null

  const status = shopStatusMeta[shop.status]

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5">
        <Link to="/shop">
          <Logo />
        </Link>
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-cream-3 bg-white/70 p-2.5">
          <ShopAvatar name={shop.name} tint={shop.tint} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-brown-900">{shop.name}</p>
            <div className="mt-0.5">
              <Badge tone={shop.status === 'approved' ? 'success' : shop.status === 'pending' ? 'warning' : 'danger'}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-brown-900 text-cream shadow-sm'
                  : 'text-brown-500 hover:bg-cream-2 hover:text-brown-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="flex-1">{item.label}</span>
                {item.label === 'Orders' && counts.placed > 0 && (
                  <span
                    className={cn(
                      'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                      isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700',
                    )}
                  >
                    {counts.placed}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-cream-3 p-3">
        <Link
          to="/shop/onboarding"
          className="flex items-start gap-2 rounded-xl bg-orange-50 p-2.5 text-[10px] leading-relaxed text-orange-700"
        >
          <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="block font-semibold">Shop onboarding & KYC</span>
            View application status and store details.
          </span>
        </Link>
        <button
          type="button"
          onClick={() => {
            signOut()
            navigate('/')
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-brown-400 transition-colors hover:bg-cream-2 hover:text-brown-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Switch demo role
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-cream-3 bg-cream-2/40 lg:block">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-cream-3 bg-cream/90 px-4 backdrop-blur-md lg:h-16 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-4 bg-white/70 text-brown-600 lg:hidden"
              aria-label="Open shop menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="lg:hidden">
              <ShopAvatar name={shop.name} tint={shop.tint} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brown-900 lg:text-base">
                {shop.name}
              </p>
              <p className="text-[10px] text-brown-400">
                {shop.town} · {status.label} {shop.open ? '· Open now' : '· Closed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="orange" className="hidden sm:inline-flex">
              Demo · {counts.placed} new order{counts.placed === 1 ? '' : 's'}
            </Badge>
            <Link to="/" className="hidden text-[11px] font-medium text-brown-400 hover:text-brown-700 sm:block">
              Exit demo
            </Link>
            <Link to="/shop/profile" aria-label="Shop profile">
              <ShopAvatar name={shop.name} tint={shop.tint} size="sm" className="hidden lg:flex" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-10 lg:pt-6">
          <Outlet />
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-cream-3 bg-cream/95 backdrop-blur-md lg:hidden">
        <div className="flex items-stretch justify-around">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[9px] font-medium',
                  isActive ? 'text-orange-600' : 'text-brown-400',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
              {item.label === 'Orders' && counts.placed > 0 && (
                <span className="absolute right-2 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[8px] font-bold text-white">
                  {counts.placed}
                </span>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[9px] font-medium text-brown-400"
          >
            <Menu className="h-[18px] w-[18px]" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-brown-950/40 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="animate-slide-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-cream-3 bg-cream p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShopAvatar name={shop.name} tint={shop.tint} size="md" />
                <div>
                  <p className="text-sm font-semibold text-brown-900">{shop.name}</p>
                  <p className="text-[10px] text-brown-400">{shop.town} · {status.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-2 text-brown-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-1.5">
              {navItems.slice(4).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-cream-3 bg-white/70 px-3.5 py-3 text-sm font-medium text-brown-700"
                >
                  <item.icon className="h-4 w-4 text-orange-500" />
                  {item.label}
                </Link>
              ))}
              <Link
                to="/shop/onboarding"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-cream-3 bg-white/70 px-3.5 py-3 text-sm font-medium text-brown-700"
              >
                <Rocket className="h-4 w-4 text-orange-500" />
                Onboarding & KYC
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  resetDemoData()
                }}
              >
                Reset demo data
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={LogOut}
                onClick={() => {
                  signOut()
                  navigate('/')
                }}
              >
                Switch role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
