import type { ReactNode } from 'react'
import { Info, Search } from 'lucide-react'
import { cn } from '@/utils'

/**
 * Small shared building blocks for the shopkeeper, rider and admin dashboards.
 * Everything here is presentation-only — no data logic.
 */

export function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-10 min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-cream-4 bg-white/90 px-3',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-brown-300" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-xs text-brown-900 placeholder:text-brown-300 focus:outline-none"
      />
    </div>
  )
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

export function TableWrap({
  children,
  className,
  minWidth = 'min-w-[640px]',
}: {
  children: ReactNode
  className?: string
  minWidth?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-cream-3 bg-white/85 shadow-card', className)}>
      <table className={cn('w-full text-left text-xs', minWidth)}>{children}</table>
    </div>
  )
}

export const thClass =
  'whitespace-nowrap border-b border-cream-3 bg-cream-2/50 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-brown-400'

export const tdClass = 'border-b border-cream-2 px-3.5 py-2.5 align-middle text-brown-600 last:border-0'

export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-center text-[10px] leading-relaxed text-brown-300', className)}>
      {children ?? 'Demo data only. No real money, rider or customer records are involved.'}
    </p>
  )
}

export function InfoBanner({
  title,
  children,
  tone = 'info',
  action,
  icon: Icon = Info,
}: {
  title: string
  children?: ReactNode
  tone?: 'info' | 'warning' | 'success' | 'danger'
  action?: ReactNode
  icon?: typeof Info
}) {
  const tones = {
    info: 'border-info/20 bg-info-soft/70 text-info',
    warning: 'border-warning/20 bg-warning-soft/70 text-warning',
    success: 'border-success/20 bg-success-soft/70 text-success',
    danger: 'border-danger/20 bg-danger-soft/70 text-danger',
  }
  return (
    <div className={cn('flex flex-wrap items-start gap-2.5 rounded-xl border p-3', tones[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-[11px] leading-relaxed opacity-90">{children}</div>}
      </div>
      {action}
    </div>
  )
}

export function KeyValue({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 text-[11px]', className)}>
      <span className="text-brown-400">{label}</span>
      <span className="text-right font-medium text-brown-700">{children}</span>
    </div>
  )
}

export function TinyBar({ value, max, tone = 'orange' }: { value: number; max: number; tone?: 'orange' | 'success' | 'danger' }) {
  const tones = { orange: 'bg-orange-500', success: 'bg-success', danger: 'bg-danger' }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-3">
      <div
        className={cn('h-full rounded-full', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(2, (value / Math.max(max, 1)) * 100))}%` }}
      />
    </div>
  )
}
