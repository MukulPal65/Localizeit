import { useState, useMemo } from 'react'
import {
  Activity,
  AlertCircle,
  Bike,
  Clock,
  Filter,
  Layers,
  RotateCcw,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  User,
} from 'lucide-react'
import { useActivityStore } from '@/store/activity'
import { toast } from '@/store/toast'
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { formatTime, timeAgo } from '@/utils'
import type { Role } from '@/types'

export function AdminActivityPage() {
  const entries = useActivityStore((s) => s.entries)
  const reset = useActivityStore((s) => s.reset)

  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (roleFilter !== 'all' && entry.role !== roleFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        entry.actor.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.targetLabel.toLowerCase().includes(q)
      )
    })
  }, [entries, roleFilter, search])

  const roleTone = (role: string) => {
    switch (role) {
      case 'admin':
        return 'orange'
      case 'shopkeeper':
        return 'warning'
      case 'rider':
        return 'info'
      case 'buyer':
        return 'success'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="System Audit & Activity Feed"
          subtitle="Real-time chronological trace of orders, approvals, payments, and system events."
        />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            reset()
            toast('Activity Log Reset', 'Returned to original seed trace.', 'info')
          }}
          leftIcon={RotateCcw}
        >
          Reset Log
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search action, actor, order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={Search}
          />
        </div>

        <div className="flex w-full sm:w-auto rounded-xl border border-cream-3 bg-white p-1 text-xs">
          {(['all', 'buyer', 'shopkeeper', 'rider', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`flex-1 sm:flex-none rounded-lg px-3 py-1 font-semibold capitalize transition-all ${
                roleFilter === r
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-brown-500 hover:text-brown-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No Activity Found"
          description="Actions performed by buyers, shops, riders or admins will automatically appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredEntries.map((entry) => (
            <Card
              key={entry.id}
              className="p-3.5 transition-shadow hover:shadow-soft flex items-start gap-3.5"
            >
              <div className="mt-0.5 rounded-full bg-cream-2 p-2 text-brown-600 shrink-0">
                {entry.role === 'shopkeeper' && <Store className="h-4 w-4 text-warning-dark" />}
                {entry.role === 'rider' && <Bike className="h-4 w-4 text-info" />}
                {entry.role === 'admin' && <ShieldCheck className="h-4 w-4 text-orange-600" />}
                {entry.role === 'buyer' && <User className="h-4 w-4 text-success" />}
                {entry.role === 'system' && <Activity className="h-4 w-4 text-brown-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-brown-900">
                      {entry.action}
                    </span>
                    <Badge tone={roleTone(entry.role)}>
                      {entry.role}
                    </Badge>
                    <span className="rounded bg-cream-2 px-1.5 py-0.5 text-[10px] font-mono text-brown-600">
                      {entry.targetLabel}
                    </span>
                  </div>

                  <span className="text-[10px] text-brown-400">
                    {timeAgo(entry.at)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-brown-600 leading-relaxed">
                  {entry.description}
                </p>

                <p className="mt-1 text-[10px] text-brown-400">
                  By <span className="font-semibold text-brown-700">{entry.actor}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DemoNote>Audit entries are logged across all persona tabs to monitor platform operations.</DemoNote>
    </div>
  )
}
