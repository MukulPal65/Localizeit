import { useState } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Globe,
  HardDrive,
  KeyRound,
  Lock,
  MapPin,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { resetDemoData } from '@/services/demo'
import { envConfig } from '@/config/env'
import { toast } from '@/store/toast'
import { Badge, Button, Card, Modal, PageHeader } from '@/components/ui/primitives'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'

export function AdminSettingsPage() {
  const [confirmReset, setConfirmReset] = useState(false)

  const integrations = [
    {
      name: 'Supabase Database & Auth',
      key: 'supabase',
      active: Boolean(envConfig.supabase.url),
      desc: 'Central PostgreSQL backend and row-level security.',
      icon: Database,
    },
    {
      name: 'Razorpay UPI & Gateway',
      key: 'razorpay',
      active: Boolean(envConfig.razorpay.keyId),
      desc: 'Instant digital payments and merchant escrow splits.',
      icon: Wallet,
    },
    {
      name: 'LocalizeIt AI Discovery Assistant',
      key: 'ai',
      active: Boolean(envConfig.ai.apiKey),
      desc: 'Smart product matching and regional language queries.',
      icon: Bot,
    },
    {
      name: 'Maps & GPS Geocoding',
      key: 'maps',
      active: Boolean(envConfig.maps.apiKey),
      desc: 'Precision village address lookup and rider routing.',
      icon: MapPin,
    },
    {
      name: 'SMS & WhatsApp Gateway',
      key: 'sms',
      active: Boolean(envConfig.notifications.smsKey),
      desc: 'OTP authentication and order status notifications.',
      icon: Smartphone,
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Platform & Infrastructure Settings"
        subtitle="Configure pilot deployment parameters, external integrations, and demo persistence."
      />

      {/* Cluster Environment Status */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-orange-500" />
            <h3 className="font-heading text-sm font-bold text-brown-900">
              Pilot Cluster Deployment
            </h3>
          </div>
          <Badge tone="success">Operational · Demo Mode</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-cream-3 bg-cream-2/50 p-3">
            <p className="font-bold text-brown-900">Cluster 1: Bhadohi, UP</p>
            <p className="text-[11px] text-brown-500 mt-0.5">Towns: Gyanpur, Aurai, Bhadohi town</p>
            <p className="text-[10px] text-success font-semibold mt-1">Full Serviceability Active</p>
          </div>

          <div className="rounded-xl border border-cream-3 bg-cream-2/50 p-3">
            <p className="font-bold text-brown-900">Cluster 2: Nalanda, BR</p>
            <p className="text-[11px] text-brown-500 mt-0.5">Towns: Biharsharif, Rajgir</p>
            <p className="text-[10px] text-success font-semibold mt-1">Full Serviceability Active</p>
          </div>

          <div className="rounded-xl border border-cream-3 bg-cream-2/50 p-3">
            <p className="font-bold text-brown-900">Cluster 3: Banswara, RJ</p>
            <p className="text-[11px] text-brown-500 mt-0.5">Towns: Banswara City, Ghatol</p>
            <p className="text-[10px] text-warning font-semibold mt-1">Pickup + Pilot Delivery</p>
          </div>
        </div>
      </Card>

      {/* External Integration Hub */}
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="font-heading text-sm font-bold text-brown-900 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-orange-500" />
            Backend API Connectors
          </h3>
          <p className="text-xs text-brown-500 mt-0.5">
            When API keys are unset in <code className="text-orange-600 font-mono">.env</code>, the app gracefully runs on built-in realistic mock adapters.
          </p>
        </div>

        <div className="divide-y divide-cream-3">
          {integrations.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-cream-2 p-2 text-brown-600">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brown-900">{item.name}</span>
                    <Badge tone={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'Connected' : 'Mock Adapter'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-brown-500">{item.desc}</p>
                </div>
              </div>

              <span className="text-[11px] text-brown-400 hidden sm:inline">
                {item.active ? 'Live API calls' : 'In-memory simulation'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Demo State Control */}
      <Card className="p-4 border-danger/30 bg-danger-soft/20 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading text-sm font-bold text-danger flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Demo State
            </h3>
            <p className="text-xs text-brown-600 mt-1 max-w-lg">
              Clears all local browser modifications, created products, demo orders, and returns all stores and fleets to the original seed state.
            </p>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={() => setConfirmReset(true)}
            leftIcon={RotateCcw}
          >
            Reset All Data
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset All Demo Data?"
        description="This will clear your current local shopping carts, newly created shops, and simulated delivery progress."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={() => resetDemoData()}>
              Yes, Reset Everything
            </Button>
          </>
        }
      >
        <p className="text-xs text-brown-600">
          Factory seed data for Bhadohi, Nalanda, and Banswara will be re-initialized.
        </p>
      </Modal>

      <DemoNote>LocalizeIt architecture allows instant zero-downtime switching between full mock and live cloud services.</DemoNote>
    </div>
  )
}
