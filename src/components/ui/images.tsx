import { MapPin, Store } from 'lucide-react'
import { categoryEmoji, categoryGradient } from '@/data/categories'
import { cn, initials } from '@/utils'

const categoryImages: Record<string, string> = {
  kirana: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=640&q=80',
  dairy: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=640&q=80',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=640&q=80',
  stationery: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=640&q=80',
  pharmacy: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=640&q=80',
  hardware: 'https://images.unsplash.com/photo-1581147036324-c17ac41d8b8b?auto=format&fit=crop&w=640&q=80',
  fashion: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=640&q=80',
  electronics: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=640&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=640&q=80',
  agriculture: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=640&q=80',
}

export function ProductImage({
  name,
  categoryId,
  size = 'md',
  className,
  deal,
}: {
  name: string
  categoryId: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  deal?: boolean
}) {
  const sizes = {
    xs: 'h-10 w-10 text-lg rounded-lg',
    sm: 'h-16 w-16 text-2xl rounded-xl',
    md: 'h-full w-full aspect-square text-4xl rounded-xl',
    lg: 'h-44 w-full text-6xl rounded-2xl',
  }
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        categoryGradient(categoryId),
        sizes[size],
        className,
      )}
      aria-label={name}
      role="img"
    >
      {categoryImages[categoryId] && (
        <img
          src={categoryImages[categoryId]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      )}
      <span className="pattern-dots absolute inset-0 opacity-40" />
      <span className="relative drop-shadow-sm" aria-hidden>
        {categoryEmoji(categoryId)}
      </span>
      {deal && (
        <span className="absolute right-1 top-1 rounded-full bg-danger px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
          Deal
        </span>
      )}
    </div>
  )
}

export function ShopAvatar({
  name,
  tint = 'from-orange-200 to-cream-3',
  size = 'md',
  className,
}: {
  name: string
  tint?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'h-9 w-9 text-xs rounded-lg',
    md: 'h-12 w-12 text-sm rounded-xl',
    lg: 'h-20 w-20 text-xl rounded-2xl',
  }
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br font-heading font-bold text-brown-800 ring-1 ring-white/60',
        tint,
        sizes[size],
        className,
      )}
      aria-hidden
    >
      <span className="pattern-dots absolute inset-0 opacity-30" />
      <span className="relative">{initials(name)}</span>
    </div>
  )
}

export function Logo({
  size = 'md',
  showWordmark = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}) {
  const marks = {
    sm: 'h-7 w-7 rounded-lg',
    md: 'h-9 w-9 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
  }
  const iconSizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'relative flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-cta',
          marks[size],
        )}
      >
        <Store className={iconSizes[size]} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-cream bg-brown-900" />
      </span>
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight text-brown-900">
          Localize<span className="text-orange-500">It</span>
        </span>
      )}
    </span>
  )
}

export function MapPinLine({ className }: { className?: string }) {
  return <MapPin className={cn('h-3.5 w-3.5', className)} />
}

/** A decorative, non-interactive map placeholder used for delivery demos. */
export function MapPlaceholder({
  label = 'Live map is a demo placeholder',
  className,
  compact = false,
  latitude,
  longitude,
  animated = false,
}: {
  label?: string
  className?: string
  compact?: boolean
  latitude?: number
  longitude?: number
  animated?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-cream-3 bg-cream-2',
        compact ? 'h-24' : 'h-44',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-0 pattern-dots opacity-50" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 160" preserveAspectRatio="none">
        <path d="M-10 120 C60 90 90 130 140 95 S230 60 310 80" stroke="#D3BEA9" strokeWidth="10" fill="none" />
        <path d="M-10 120 C60 90 90 130 140 95 S230 60 310 80" stroke="#FDF8F1" strokeWidth="3" strokeDasharray="6 8" fill="none" />
        <path d="M40 -10 C60 40 30 90 70 170" stroke="#E6D7C3" strokeWidth="5" fill="none" />
        <path d="M210 -10 C190 50 240 100 200 170" stroke="#E6D7C3" strokeWidth="5" fill="none" />
        <circle cx="88" cy="98" r="13" fill="#FDE7D2" />
        <circle cx="88" cy="98" r="6" fill="#EE7317" />
        <circle cx="212" cy="78" r="13" fill="#FDE7D2" />
        <circle cx="212" cy="78" r="6" fill="#477A4B" />
        {animated && (
          <circle cx="150" cy="96" r="5" fill="#EE7317">
            <animate attributeName="cx" values="88;150;212;150;88" dur="6s" repeatCount="indefinite" />
            <animate attributeName="cy" values="98;95;78;95;98" dur="6s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-brown-500 shadow-sm">
        <MapPin className="h-3 w-3 text-orange-500" />
        {label}
      </div>
      {latitude != null && longitude != null && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 bottom-2 rounded-full bg-brown-900/90 px-2 py-1 text-[10px] font-semibold text-white"
        >
          Open map
        </a>
      )}
    </div>
  )
}
