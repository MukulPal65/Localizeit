import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Star,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, initials } from '@/utils'

/* ───────────────────────────── Buttons ───────────────────────────── */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-500 text-white shadow-cta hover:bg-orange-400 active:bg-orange-600 disabled:shadow-none',
  secondary:
    'bg-cream-2 text-brown-800 border border-cream-4 hover:bg-cream-3 active:bg-cream-4',
  outline:
    'border border-orange-500/60 text-orange-600 bg-transparent hover:bg-orange-50 active:bg-orange-100',
  ghost: 'text-brown-700 hover:bg-cream-2 active:bg-cream-3',
  danger: 'bg-danger text-white hover:opacity-90 active:opacity-100',
  dark: 'bg-brown-900 text-cream hover:bg-brown-800 active:bg-brown-950',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl justify-center',
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return cn(
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon: Left,
  rightIcon: Right,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Left && <Left className="h-4 w-4 shrink-0" />
      )}
      {children}
      {Right && <Right className="h-4 w-4 shrink-0" />}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={buttonClasses(variant, 'icon', cn(size === 'sm' && 'h-8 w-8 text-xs', className))}
      {...props}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
    </button>
  )
}

/* ───────────────────────────── Surfaces ───────────────────────────── */

export function Card({
  className,
  children,
  padded = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-cream-3 bg-white/85 shadow-card',
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'orange' | 'success' | 'warning' | 'danger' | 'info' | 'brown'
  className?: string
}) {
  const tones = {
    neutral: 'bg-cream-2 text-brown-600 border-cream-3',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    success: 'bg-success-soft text-success border-success/20',
    warning: 'bg-warning-soft text-warning border-warning/20',
    danger: 'bg-danger-soft text-danger border-danger/20',
    info: 'bg-info-soft text-info border-info/20',
    brown: 'bg-brown-900 text-cream border-brown-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Chip({
  active = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brown-900 bg-brown-900 text-cream'
          : 'border-cream-4 bg-white/70 text-brown-600 hover:border-brown-200 hover:bg-cream-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ───────────────────────────── Form controls ───────────────────────────── */

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && (
        <span className="flex items-center gap-1 text-xs font-medium text-brown-600">
          {label}
          {required && <span className="text-orange-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-[11px] text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-brown-400">{hint}</span>
      ) : null}
    </label>
  )
}

const controlClasses =
  'w-full rounded-xl border border-cream-4 bg-white px-3.5 text-sm text-brown-900 placeholder:text-brown-300 transition-shadow focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-cream-2 disabled:text-brown-400'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: LucideIcon
  rightSlot?: ReactNode
}

export function Input({
  label,
  hint,
  error,
  leftIcon: Left,
  rightSlot,
  className,
  required,
  ...props
}: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        {Left && (
          <Left className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-300" />
        )}
        <input
          className={cn(
            controlClasses,
            'h-11',
            Left && 'pl-9',
            rightSlot ? 'pr-10' : undefined,
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </Field>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function Textarea({ label, hint, className, ...props }: TextareaProps) {
  return (
    <Field label={label} hint={hint}>
      <textarea className={cn(controlClasses, 'min-h-24 py-2.5', className)} {...props} />
    </Field>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, hint, error, options, className, required, ...props }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <select
          className={cn(controlClasses, 'h-11 appearance-none pr-9', className)}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-300" />
      </div>
    </Field>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="min-w-0">
          {label && <p className="text-sm font-medium text-brown-800">{label}</p>}
          {description && <p className="mt-0.5 text-xs leading-relaxed text-brown-400">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ?? 'Toggle'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-orange-500' : 'bg-cream-4',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-2.5 text-left text-sm text-brown-600"
    >
      <span
        className={cn(
          'mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-orange-500 bg-orange-500 text-white' : 'border-cream-4 bg-white',
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span>{label}</span>
    </button>
  )
}

/* ───────────────────────────── Navigation / misc ───────────────────────────── */

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: Array<{ id: string; label: string; count?: number }>
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto p-1', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
            value === item.id
              ? 'bg-brown-900 text-cream shadow-sm'
              : 'text-brown-500 hover:bg-cream-2 hover:text-brown-800',
          )}
        >
          {item.label}
          {typeof item.count === 'number' && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                value === item.id ? 'bg-cream/20 text-cream' : 'bg-cream-3 text-brown-500',
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: string[]
  current: number
  onStepClick?: (index: number) => void
}) {
  return (
    <ol className="flex items-center">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
            <button
              type="button"
              disabled={!onStepClick || index > current}
              onClick={() => onStepClick?.(index)}
              className={cn('flex items-center gap-2', index > current && 'cursor-default')}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  done
                    ? 'bg-success text-white'
                    : active
                      ? 'bg-orange-500 text-white shadow-cta'
                      : 'bg-cream-3 text-brown-400',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden whitespace-nowrap text-xs font-medium sm:block',
                  active ? 'text-brown-900' : done ? 'text-success' : 'text-brown-400',
                )}
              >
                {step}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  'mx-2 h-px flex-1 sm:mx-3',
                  done ? 'bg-success/50' : 'bg-cream-4',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold text-brown-900 sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-brown-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  backTo?: () => void
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {backTo && (
          <IconButton icon={ArrowLeft} label="Go back" size="sm" onClick={backTo} className="mt-0.5" />
        )}
        <div>
          <h1 className="text-xl font-semibold text-brown-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-brown-400 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: 'neutral' | 'orange' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}) {
  const iconTones = {
    neutral: 'bg-cream-2 text-brown-500',
    orange: 'bg-orange-100 text-orange-600',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  }
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-brown-400">{label}</p>
          <p className="mt-1.5 font-heading text-xl font-semibold text-brown-900">{value}</p>
          {hint && <p className="mt-1 text-[11px] leading-relaxed text-brown-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconTones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
    </Card>
  )
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
      <span className="font-medium text-brown-800">{value.toFixed(1)}</span>
      {typeof count === 'number' && <span className="text-brown-300">({count})</span>}
    </span>
  )
}

export function QtyStepper({
  value,
  onIncrement,
  onDecrement,
  size = 'md',
  max,
}: {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  size?: 'sm' | 'md'
  max?: number
}) {
  const atMax = typeof max === 'number' && value >= max
  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-lg border border-orange-500/40 bg-orange-50',
        size === 'sm' ? 'h-7' : 'h-9',
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className={cn(
          'flex items-center justify-center text-orange-600 transition-colors hover:bg-orange-100',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className={cn(
          'min-w-6 text-center text-xs font-semibold text-orange-700',
          size === 'md' && 'text-sm',
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={atMax}
        aria-label="Increase quantity"
        className={cn(
          'flex items-center justify-center text-orange-600 transition-colors hover:bg-orange-100 disabled:opacity-40',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-2 text-brown-300">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-brown-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-brown-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Avatar({
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
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-heading font-semibold text-brown-800 ring-1 ring-white/60',
        tint,
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function Progress({
  value,
  tone = 'orange',
  className,
}: {
  value: number
  tone?: 'orange' | 'success' | 'info' | 'danger'
  className?: string
}) {
  const tones = {
    orange: 'bg-orange-500',
    success: 'bg-success',
    info: 'bg-info',
    danger: 'bg-danger',
  }
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-cream-3', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-lg bg-gradient-to-r from-cream-2 via-cream-3 to-cream-2',
        className,
      )}
    />
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-cream-3', className)} />
}

/* ───────────────────────────── Overlays ───────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  placement = 'center',
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  placement?: 'center' | 'sheet'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[80] flex justify-center overflow-y-auto bg-brown-950/45 p-0 backdrop-blur-[2px] sm:p-4',
        placement === 'sheet' ? 'items-end sm:items-center' : 'items-center',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Dialog'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'animate-scale-in w-full border border-cream-3 bg-cream shadow-lift',
          sizes[size],
          placement === 'sheet'
            ? 'max-h-[92vh] rounded-t-3xl sm:rounded-2xl'
            : 'mx-3 max-h-[88vh] rounded-2xl',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-cream-3 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-brown-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-relaxed text-brown-400">{description}</p>}
          </div>
          <IconButton icon={X} label="Close dialog" size="sm" onClick={onClose} className="-mr-1" />
        </div>
        <div className="max-h-[68vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-cream-3 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-brown-500">
        This is a demo action. It updates the local mock data only — nothing is sent to a real shop,
        rider or payment provider.
      </p>
    </Modal>
  )
}
