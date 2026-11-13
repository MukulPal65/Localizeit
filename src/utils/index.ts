import type { OrderStatus, Role, ShopStatus } from '@/types'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatCompactINR(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`
  return formatINR(value)
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`
  return `${km.toFixed(1)} km`
}

export function formatEta(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  const stamp = Date.now().toString(36).slice(-4).toUpperCase()
  return `${prefix}-${stamp}${rand}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

export function isoHoursAgo(hours: number): string {
  return isoMinutesAgo(hours * 60)
}

export function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(iso)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function pct(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item)
      if (!acc[k]) acc[k] = []
      acc[k].push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join(
    '\r\n',
  )
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Presentation metadata for every order status. */
export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; short: string; tone: string; dot: string }
> = {
  placed: {
    label: 'Order placed',
    short: 'New',
    tone: 'bg-info-soft text-info',
    dot: 'bg-info',
  },
  accepted: {
    label: 'Shop accepted',
    short: 'Accepted',
    tone: 'bg-warning-soft text-warning',
    dot: 'bg-warning',
  },
  preparing: {
    label: 'Being prepared',
    short: 'Preparing',
    tone: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
  },
  ready: {
    label: 'Ready for pickup',
    short: 'Ready',
    tone: 'bg-success-soft text-success',
    dot: 'bg-success',
  },
  picked_up: {
    label: 'Picked up',
    short: 'In transit',
    tone: 'bg-info-soft text-info',
    dot: 'bg-info',
  },
  delivered: {
    label: 'Delivered',
    short: 'Delivered',
    tone: 'bg-success-soft text-success',
    dot: 'bg-success',
  },
  rejected: {
    label: 'Rejected by shop',
    short: 'Rejected',
    tone: 'bg-danger-soft text-danger',
    dot: 'bg-danger',
  },
  cancelled: {
    label: 'Cancelled',
    short: 'Cancelled',
    tone: 'bg-cream-3 text-brown-500',
    dot: 'bg-brown-300',
  },
}

export const ORDER_FLOW: OrderStatus[] = [
  'placed',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
]

export const shopStatusMeta: Record<ShopStatus, { label: string; tone: string }> = {
  approved: { label: 'Approved', tone: 'bg-success-soft text-success' },
  pending: { label: 'Pending review', tone: 'bg-warning-soft text-warning' },
  rejected: { label: 'Rejected', tone: 'bg-danger-soft text-danger' },
  suspended: { label: 'Suspended', tone: 'bg-cream-3 text-brown-500' },
}

export const roleLabels: Record<Role, string> = {
  buyer: 'Buyer',
  shopkeeper: 'Shopkeeper',
  rider: 'Delivery partner',
  admin: 'Super admin',
}

export const roleHome: Record<Role, string> = {
  buyer: '/buyer',
  shopkeeper: '/shop',
  rider: '/rider',
  admin: '/admin',
}

export const languageOptions = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bho', label: 'Bhojpuri', native: 'भोजपुरी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
]

export const vehicleLabels: Record<string, string> = {
  cycle: 'Cycle',
  bike: 'Motorbike',
  scooter: 'Scooter',
  auto: 'Auto rickshaw',
}

export const paymentLabels: Record<string, string> = {
  upi: 'UPI (mock)',
  cod: 'Cash on delivery',
}
