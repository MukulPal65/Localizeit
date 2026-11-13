import { useState } from 'react'
import {
  Calculator,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  History,
  IndianRupee,
  Percent,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react'
import { useFeeStore } from '@/store/fees'
import { updateFeeConfig } from '@/services/workflow'
import { updateFeeRules } from '@/services/supabaseService'
import { Badge, Button, Card, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import { formatINR } from '@/utils'

export function AdminFeesPage() {
  const currentConfig = useFeeStore((s) => s.config)

  const [platformFee, setPlatformFee] = useState(currentConfig.platformFee)
  const [freeFeeAbove, setFreeFeeAbove] = useState(currentConfig.freeFeeAbove)
  const [deliveryFeeNear, setDeliveryFeeNear] = useState(currentConfig.deliveryFeeNear)
  const [deliveryFeeFar, setDeliveryFeeFar] = useState(currentConfig.deliveryFeeFar)
  const [nearDistanceKm, setNearDistanceKm] = useState(currentConfig.nearDistanceKm)
  const [shopCommissionPct, setShopCommissionPct] = useState(currentConfig.shopCommissionPct)
  const [codEnabled, setCodEnabled] = useState(currentConfig.codEnabled)
  const [codMaxAmount, setCodMaxAmount] = useState(currentConfig.codMaxAmount)

  const [saving, setSaving] = useState(false)
  const [changeReason, setChangeReason] = useState('Standard seasonal rate review')

  // Simulation state
  const [simOrderValue, setSimOrderValue] = useState(450)
  const [simDistance, setSimDistance] = useState(3.5)

  const simDeliveryFee =
    simDistance <= nearDistanceKm ? deliveryFeeNear : deliveryFeeFar
  const simPlatformFee = simOrderValue > freeFeeAbove ? 0 : platformFee
  const simCommission = Math.round((simOrderValue * shopCommissionPct) / 100)
  const simShopPayout = simOrderValue - simCommission
  const simCustomerTotal = simOrderValue + simDeliveryFee + simPlatformFee

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const patch = {
      platformFee,
      freeFeeAbove,
      deliveryFeeNear,
      deliveryFeeFar,
      nearDistanceKm,
      shopCommissionPct,
      codEnabled,
      codMaxAmount,
    }

    try {
      await updateFeeRules(patch, 'super-admin', changeReason.trim() || 'Admin rule adjustment')
      updateFeeConfig(patch)
    } catch (err) {
      console.warn('Fee rule update error:', err)
      updateFeeConfig(patch)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    useFeeStore.getState().reset()
    const fresh = useFeeStore.getState().config
    setPlatformFee(fresh.platformFee)
    setFreeFeeAbove(fresh.freeFeeAbove)
    setDeliveryFeeNear(fresh.deliveryFeeNear)
    setDeliveryFeeFar(fresh.deliveryFeeFar)
    setNearDistanceKm(fresh.nearDistanceKm)
    setShopCommissionPct(fresh.shopCommissionPct)
    setCodEnabled(fresh.codEnabled)
    setCodMaxAmount(fresh.codMaxAmount)
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Fees & Commission Engine"
        subtitle="Configure platform take-rates, tiered delivery charges, and cash handling parameters."
        action={
          <Badge tone="orange" className="flex items-center gap-1 font-mono">
            <History className="h-3 w-3" />
            Config Version {(currentConfig as { version?: number }).version || 1}
          </Badge>
        }
      />

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-heading text-sm font-bold text-brown-900 flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-500" />
              Platform Monetization & Commission
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brown-700 mb-1">
                  Default Shop Commission (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={shopCommissionPct}
                  onChange={(e) => setShopCommissionPct(Number(e.target.value))}
                  className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
                />
                <p className="mt-1 text-[10px] text-brown-400">
                  Deducted from merchant payouts on delivered orders.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-700 mb-1">
                  Buyer Platform Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(Number(e.target.value))}
                  className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
                />
                <p className="mt-1 text-[10px] text-brown-400">
                  Flat convenience fee added per multi-shop checkout.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-700 mb-1">
                  Waive Platform Fee Above (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={freeFeeAbove}
                  onChange={(e) => setFreeFeeAbove(Number(e.target.value))}
                  className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
                />
                <p className="mt-1 text-[10px] text-brown-400">
                  Orders over this value enjoy ₹0 platform fee.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-heading text-sm font-bold text-brown-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-info" />
              Hyperlocal Delivery Fee Slabs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-brown-700 mb-1">
                  Near Radius Cutoff (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="0.5"
                  value={nearDistanceKm}
                  onChange={(e) => setNearDistanceKm(Number(e.target.value))}
                  className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-700 mb-1">
                  Near Delivery Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFeeNear}
                  onChange={(e) => setDeliveryFeeNear(Number(e.target.value))}
                  className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-700 mb-1">
                  Far Delivery Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFeeFar}
                  onChange={(e) => setDeliveryFeeFar(Number(e.target.value))}
                  className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-heading text-sm font-bold text-brown-900 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-warning" />
              Cash on Delivery (COD) Rules
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-brown-900">Enable Cash on Delivery</p>
                <p className="text-[11px] text-brown-400">
                  Allow buyers to pay cash at doorstep for delivery orders
                </p>
              </div>
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="h-5 w-5 rounded text-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">
                Maximum Order Limit for COD (₹)
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={codMaxAmount}
                onChange={(e) => setCodMaxAmount(Number(e.target.value))}
                className="w-full sm:w-60 rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
              />
            </div>

            <div className="border-t border-cream-2 pt-3">
              <label className="block text-xs font-bold text-brown-700 mb-1">
                Change Log Reason (Audit Trail)
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Reason for policy update (e.g. Festival delivery waiver)"
                className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs text-brown-900"
              />
              <p className="mt-1 text-[10px] text-brown-400">
                Audited into PostgreSQL fee_rules with version snapshot.
              </p>
            </div>
          </Card>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="md" variant="primary" leftIcon={Save} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Version Config'}
            </Button>
            <Button type="button" size="md" variant="ghost" onClick={handleReset} leftIcon={RotateCcw}>
              Restore Defaults
            </Button>
          </div>
        </div>

        {/* Live Simulator Column */}
        <div className="space-y-4">
          <Card className="p-4 bg-orange-50/50 border-orange-200 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-600" />
              <h3 className="font-heading text-sm font-bold text-brown-900">Live Fee Simulator</h3>
            </div>
            <p className="text-[11px] text-brown-600">
              Test how a customer checkout is priced under your rules:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-brown-700">
                  Sample Cart Items Value: {formatINR(simOrderValue)}
                </label>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="25"
                  value={simOrderValue}
                  onChange={(e) => setSimOrderValue(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-brown-700">
                  Delivery Distance: {simDistance} km
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={simDistance}
                  onChange={(e) => setSimDistance(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            {/* Calculated Breakdown */}
            <div className="rounded-xl bg-white p-3 space-y-2 text-xs border border-cream-3">
              <p className="font-bold uppercase tracking-wider text-[10px] text-brown-400">
                Customer Pays:
              </p>
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>{formatINR(simOrderValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>{formatINR(simDeliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span>{simPlatformFee === 0 ? 'FREE' : formatINR(simPlatformFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-brown-900 border-t border-cream-2 pt-1.5">
                <span>Grand Total:</span>
                <span className="text-orange-600 font-heading">{formatINR(simCustomerTotal)}</span>
              </div>

              <div className="border-t border-cream-2 pt-2 space-y-1 text-[11px]">
                <p className="font-bold uppercase tracking-wider text-[10px] text-brown-400">
                  Platform & Merchant Split:
                </p>
                <div className="flex justify-between text-success font-medium">
                  <span>Merchant Take-Home:</span>
                  <span>{formatINR(simShopPayout)}</span>
                </div>
                <div className="flex justify-between text-brown-600 font-medium">
                  <span>Platform Commission ({shopCommissionPct}%):</span>
                  <span>{formatINR(simCommission)}</span>
                </div>
              </div>
            </div>
          </Card>

          <DemoNote>Fee changes apply instantly to all subsequent buyer cart calculations and checkouts.</DemoNote>
        </div>
      </form>
    </div>
  )
}
