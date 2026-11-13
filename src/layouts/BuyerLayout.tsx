import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Home,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react'
import { cn, formatINR, formatDistance } from '@/utils'
import { Logo } from '@/components/ui/images'
import { LocationChip } from '@/components/shared/LocationPicker'
import { useCatalogStore } from '@/store/catalog'
import { useBuyerStore } from '@/store/buyer'
import { useCartSummary } from '@/hooks/useCartSummary'
import { Avatar } from '@/components/ui/primitives'

const navItems = [
  { to: '/buyer', label: 'Home', icon: Home, end: true },
  { to: '/buyer/shops', label: 'Shops', icon: Store },
  { to: '/buyer/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/buyer/orders', label: 'Orders', icon: ReceiptText },
  { to: '/buyer/account', label: 'Account', icon: UserRound },
]

const desktopNav = [
  { to: '/buyer', label: 'Home', end: true },
  { to: '/buyer/shops', label: 'Nearby shops' },
  { to: '/buyer/categories', label: 'Categories' },
  { to: '/buyer/orders', label: 'My orders' },
  { to: '/buyer/ai', label: 'AI assistant' },
]

export function BuyerLayout() {
  const location = useLocation()
  const { itemCount, quote } = useCartSummary()
  const profile = useBuyerStore((s) => s.profile)
  const shops = useCatalogStore((s) => s.shops)
  const cartShop = quote.groups[0]

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="sticky top-0 z-40 border-b border-cream-3/80 bg-cream/90 backdrop-blur-md">
        <div className="hidden h-16 items-center gap-6 px-4 sm:flex lg:px-6">
          <Link to="/buyer" className="shrink-0">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1">
            {desktopNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-brown-900 text-cream'
                      : 'text-brown-500 hover:bg-cream-2 hover:text-brown-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LocationChip />
            <Link
              to="/buyer/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cream-4 bg-white/70 text-brown-600 transition-colors hover:border-orange-300"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
            <Link to="/buyer/account">
              <Avatar name={profile.name} tint={profile.avatarTint} />
            </Link>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/buyer">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to="/buyer/ai"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-brown-500"
                aria-label="Ask LocalizeIt AI"
              >
                <Sparkles className="h-[18px] w-[18px]" />
              </Link>
              <Link
                to="/buyer/cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-brown-600"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link to="/buyer/account" aria-label="Your account">
                <Avatar name={profile.name} tint={profile.avatarTint} size="sm" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 pb-2.5">
            <div className="min-w-0 flex-1">
              <LocationChip />
            </div>
            <Link
              to="/buyer/ai"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1.5 text-[10px] font-semibold text-orange-700"
            >
              <Sparkles className="h-3 w-3" />
              Ask AI
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 pt-4 sm:px-6 sm:pb-16 lg:px-6">
        <Outlet />
      </main>

      {itemCount > 0 && location.pathname !== '/buyer/cart' && location.pathname !== '/buyer/checkout' && (
        <div className="fixed inset-x-0 bottom-[62px] z-30 px-3 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[360px] sm:px-0">
          <Link
            to="/buyer/cart"
            className="animate-slide-up flex items-center gap-3 rounded-2xl border border-brown-800 bg-brown-900 px-4 py-3 text-cream shadow-lift"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <ShoppingBag className="h-4 w-4 text-orange-300" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-cream/60">
                {itemCount} item{itemCount > 1 ? 's' : ''} · {quote.groups.length} shop
                {quote.groups.length > 1 ? 's' : ''}
              </span>
              <span className="block text-sm font-semibold">
                {formatINR(quote.breakdown.grandTotal)}
                {cartShop && (
                  <span className="ml-1 text-[10px] font-normal text-cream/50">
                    + delivery from {formatDistance(cartShop.shop.distanceKm)}
                  </span>
                )}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-300">
              View cart
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-cream-3 bg-cream/95 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center gap-0.5 px-2 pb-2 pt-2.5 text-[9px] font-medium transition-colors',
                  isActive ? 'text-orange-600' : 'text-brown-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                  {item.label === 'Cart' && itemCount > 0 && (
                    <span className="absolute right-2 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[8px] font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                  {isActive && <span className="absolute -top-px h-0.5 w-8 rounded-full bg-orange-500" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex h-16 items-center justify-between px-5">
        <Logo size="sm" />
        <span className="rounded-full border border-cream-4 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-brown-400">
          Demo onboarding · no real OTP
        </span>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-4 sm:items-center sm:py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
