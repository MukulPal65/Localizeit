import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  Bike,
  ClipboardList,
  FileBarChart2,
  IndianRupee,
  LayoutDashboard,
  Menu,
  Percent,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/utils'
import { Logo } from '@/components/ui/images'
import { Badge, IconButton } from '@/components/ui/primitives'
import { useActivityStore } from '@/store/activity'
import { useAuthStore } from '@/store/auth'
import { useCatalogStore } from '@/store/catalog'
import { useDeliveryStore } from '@/store/delivery'
import { useOrderStore } from '@/store/orders'
import { resetDemoData } from '@/services/demo'

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const shops = useCatalogStore((s) => s.shops)
  const riders = useDeliveryStore((s) => s.riders)
  const jobs = useDeliveryStore((s) => s.jobs)
  const orders = useOrderStore((s) => s.orders)
  const activity = useActivityStore((s) => s.entries)

  useEffect(() => setOpen(false), [location.pathname])

  const pendingShops = shops.filter((s) => s.status === 'pending').length
  const pendingRiders = riders.filter((r) => r.status === 'pending').length
  const unassignedJobs = jobs.filter((j) => j.status === 'available' && !j.riderId).length
  const newOrders = orders.reduce(
    (sum, order) => sum + order.shopOrders.filter((so) => so.status === 'placed').length,
    0,
  )
  const pendingSettlements = 6

  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/shops', label: 'Shops', icon: Store, badge: pendingShops },
    { to: '/admin/riders', label: 'Delivery partners', icon: Bike, badge: pendingRiders },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList, badge: newOrders },
    { to: '/admin/deliveries', label: 'Deliveries', icon: Truck, badge: unassignedJobs },
    { to: '/admin/fees', label: 'Fees & commission', icon: Percent },
    { to: '/admin/settlements', label: 'Settlements', icon: Wallet, badge: pendingSettlements },
    { to: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
    { to: '/admin/activity', label: 'System activity', icon: ScrollText, badge: activity.length },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  const sidebar = (
    <div className="flex h-full flex-col bg-brown-950 text-cream">
      <div className="flex items-center justify-between px-5 pb-5 pt-5">
        <Link to="/admin">
          <span className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-cta">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-heading text-base font-semibold leading-5">
                Localize<span className="text-orange-400">It</span>
              </span>
              <span className="block text-[9px] uppercase tracking-[0.18em] text-cream/40">
                Super admin
              </span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="rounded-lg p-1.5 text-cream/60 hover:bg-white/10 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-3 mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-[10px] uppercase tracking-wide text-cream/40">Pilot cluster</p>
        <p className="mt-1 text-xs font-medium text-cream">Bhadohi · Nalanda · Banswara</p>
        <p className="mt-1 text-[10px] leading-relaxed text-cream/40">
          {shops.length} shops · {riders.length} riders · {orders.length} demo orders
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11.5px] font-medium transition-colors',
                isActive
                  ? 'bg-orange-500 text-white shadow-cta'
                  : 'text-cream/60 hover:bg-white/5 hover:text-cream',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
            <span className="flex-1">{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span
                className={cn(
                  'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                  item.label === 'System activity'
                    ? 'bg-white/10 text-cream/60'
                    : 'bg-orange-400/90 text-brown-950',
                )}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-brown-950">
            SA
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium">Platform admin</p>
            <p className="text-[9px] text-cream/40">Demo access · all roles</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut()
            navigate('/')
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-cream/50 transition-colors hover:bg-white/5 hover:text-cream"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Switch demo role
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <div className="absolute inset-0 bg-brown-950/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="animate-slide-up absolute inset-y-0 left-0 w-[268px] shadow-lift">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col bg-cream">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-cream-3 bg-cream/90 px-4 backdrop-blur-md lg:h-16 lg:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-4 bg-white/70 text-brown-600 lg:hidden"
              aria-label="Open admin navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-medium uppercase tracking-wide text-brown-400">
                Central management
              </p>
              <p className="text-sm font-semibold text-brown-900">Platform overview</p>
            </div>
            <span className="sm:hidden">
              <Logo size="sm" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="orange" className="hidden md:inline-flex">
              <IndianRupee className="h-2.5 w-2.5" />
              Demo billing data
            </Badge>
            <Link
              to="/admin/activity"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cream-4 bg-white/70 text-brown-500"
              aria-label="Activity notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[8px] font-bold text-white">
                {pendingShops + pendingRiders}
              </span>
            </Link>
            <Link
              to="/"
              onClick={() => resetDemoData()}
              className="hidden rounded-lg border border-cream-4 bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-brown-500 hover:border-orange-300 sm:block"
            >
              Reset demo
            </Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brown-900 text-[10px] font-bold text-cream">
              SA
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-12 pt-4 lg:px-6 lg:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
