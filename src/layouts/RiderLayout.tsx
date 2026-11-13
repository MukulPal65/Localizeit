import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BadgeIndianRupee,
  Bike,
  BriefcaseBusiness,
  Home,
  PackageCheck,
  Power,
  UserRound,
  Wallet,
} from 'lucide-react'
import { cn } from '@/utils'
import { Logo } from '@/components/ui/images'
import { Avatar, Badge } from '@/components/ui/primitives'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { toast } from '@/store/toast'

const navItems = [
  { to: '/rider', label: 'Home', icon: Home, end: true },
  { to: '/rider/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/rider/active', label: 'Active', icon: Bike },
  { to: '/rider/cod', label: 'COD', icon: Wallet },
  { to: '/rider/earnings', label: 'Earnings', icon: BadgeIndianRupee },
]

export function RiderLayout() {
  const riderId = useAuthStore((s) => s.riderId)
  const rider = useDeliveryStore((s) => s.riders.find((r) => r.id === riderId))
  const setOnline = useDeliveryStore((s) => s.setOnline)
  const jobs = useDeliveryStore((s) => s.jobs)
  const codEntries = useDeliveryStore((s) => s.codEntries)

  if (!rider) return null

  const activeCount = jobs.filter(
    (job) => job.riderId === rider.id && ['accepted', 'picked_up'].includes(job.status),
  ).length
  const pendingCod = codEntries.filter(
    (entry) => entry.status === 'pending' && jobs.some((job) => job.id === entry.jobId && job.riderId === rider.id),
  ).length

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-cream-3 bg-cream shadow-soft">
      <header className="sticky top-0 z-40 border-b border-cream-3 bg-cream/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/rider">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (rider.status !== 'approved') {
                  toast('Approval pending', 'Online status unlocks after rider verification.', 'warning')
                  return
                }
                setOnline(rider.id, !rider.online)
                toast(
                  rider.online ? 'You are offline' : 'You are online',
                  rider.online ? 'New job offers are paused.' : 'Nearby delivery jobs will appear here.',
                  rider.online ? 'info' : 'success',
                )
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-colors',
                rider.online
                  ? 'border-success/30 bg-success-soft text-success'
                  : 'border-cream-4 bg-cream-2 text-brown-400',
              )}
            >
              <Power className="h-3 w-3" />
              {rider.online ? 'Online' : 'Offline'}
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  rider.online ? 'bg-success' : 'bg-brown-300',
                )}
              />
            </button>
            <Link to="/rider/profile" aria-label="Rider profile">
              <Avatar name={rider.name} tint="from-orange-200 to-cream-3" size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-cream-3 bg-cream/95 backdrop-blur-md">
        <div className="flex items-stretch justify-around px-1">
          {navItems.map((item) => (
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
              {({ isActive }) => (
                <>
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                  {item.label === 'Active' && activeCount > 0 && (
                    <span className="absolute right-2 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[8px] font-bold text-white">
                      {activeCount}
                    </span>
                  )}
                  {item.label === 'COD' && pendingCod > 0 && (
                    <span className="absolute right-1.5 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-0.5 text-[8px] font-bold text-white">
                      {pendingCod}
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

export function RiderIdentity() {
  const riderId = useAuthStore((s) => s.riderId)
  const rider = useDeliveryStore((s) => s.riders.find((r) => r.id === riderId))
  if (!rider) return null
  return (
    <div className="flex items-center gap-2">
      <Avatar name={rider.name} size="sm" />
      <div>
        <p className="text-xs font-semibold text-brown-900">{rider.name}</p>
        <Badge tone={rider.status === 'approved' ? 'success' : 'warning'}>{rider.status}</Badge>
      </div>
    </div>
  )
}

export { PackageCheck, UserRound }
