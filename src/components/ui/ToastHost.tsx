import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/store/toast'
import { cn } from '@/utils'

const toneStyles = {
  success: { icon: CheckCircle2, wrap: 'border-success/25', iconClass: 'text-success' },
  error: { icon: XCircle, wrap: 'border-danger/25', iconClass: 'text-danger' },
  warning: { icon: AlertTriangle, wrap: 'border-warning/25', iconClass: 'text-warning' },
  info: { icon: Info, wrap: 'border-info/25', iconClass: 'text-info' },
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3">
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone]
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            className={cn(
              'animate-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-lift backdrop-blur',
              tone.wrap,
            )}
            role="status"
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brown-900">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs leading-relaxed text-brown-500">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded-md p-0.5 text-brown-300 transition-colors hover:text-brown-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
