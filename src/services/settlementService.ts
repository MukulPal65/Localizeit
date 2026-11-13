import type { Settlement } from '@/types'
import { makeId } from '@/utils'
import { useActivityStore } from '@/store/activity'
import { useCatalogStore } from '@/store/catalog'
import { useDeliveryStore } from '@/store/delivery'
import { useFeeStore } from '@/store/fees'
import { useOrderStore } from '@/store/orders'
import { useSettlementStore } from '@/store/settlements'
import { useToastStore } from '@/store/toast'

/**
 * Demo settlement workflow. These functions only move mock numbers between
 * local stores — no real money, bank account or payment gateway is involved.
 */

function log(entry: Parameters<ReturnType<typeof useActivityStore.getState>['log']>[0]) {
  useActivityStore.getState().log(entry)
}

export function paySettlement(id: string): void {
  const settlement = useSettlementStore.getState().settlements.find((item) => item.id === id)
  if (!settlement || settlement.status === 'paid') return
  useSettlementStore.getState().markPaid(id)
  useToastStore.getState().push({
    title: 'Settlement marked paid',
    message: `${settlement.partyName} · ₹${settlement.payout.toLocaleString('en-IN')} (mock UPI transfer)`,
    tone: 'success',
  })
  log({
    actor: 'Super Admin',
    role: 'admin',
    action: 'Settlement processed',
    targetType: 'settlement',
    targetLabel: settlement.id,
    description: `Paid ₹${settlement.payout} to ${settlement.partyName} for ${settlement.period} (demo).`,
  })
}

export function payAllPendingSettlements(): number {
  const pending = useSettlementStore.getState().settlements.filter((item) => item.status === 'pending')
  pending.forEach((item) => {
    useSettlementStore.getState().markPaid(item.id)
  })
  if (pending.length) {
    useToastStore.getState().push({
      title: `${pending.length} settlements cleared`,
      message: 'All pending payouts were marked paid in the demo ledger.',
      tone: 'success',
    })
    log({
      actor: 'Super Admin',
      role: 'admin',
      action: 'Settlement batch processed',
      targetType: 'settlement',
      targetLabel: 'Batch payout',
      description: `Cleared ${pending.length} pending settlements worth ₹${pending
        .reduce((sum, item) => sum + item.payout, 0)
        .toLocaleString('en-IN')}.`,
    })
  }
  return pending.length
}

/**
 * Builds a fresh pending settlement for every shop/rider that has delivered
 * demo activity but no pending statement yet. Safe to run repeatedly.
 */
export function runSettlementCycle(): number {
  const { orders } = useOrderStore.getState()
  const shops = useCatalogStore.getState().shops
  const riders = useDeliveryStore.getState().riders
  const jobs = useDeliveryStore.getState().jobs
  const config = useFeeStore.getState().config
  const existing = useSettlementStore.getState().settlements
  const pendingParties = new Set(
    existing.filter((item) => item.status === 'pending').map((item) => `${item.party}:${item.partyId}`),
  )

  const created: Settlement[] = []
  const period = '8 – 14 Nov 2026'

  for (const shop of shops) {
    if (pendingParties.has(`shop:${shop.id}`)) continue
    const delivered = orders.flatMap((order) =>
      order.shopOrders.filter((so) => so.shopId === shop.id && so.status === 'delivered'),
    )
    if (!delivered.length) continue
    const grossSales = delivered.reduce((sum, so) => sum + so.subtotal + so.deliveryFee, 0)
    const commission = Math.round((grossSales * (shop.commissionPct || config.shopCommissionPct)) / 100)
    const codCollected = delivered.reduce((sum, so) => sum + (so.paymentMethod === 'cod' ? so.codAmount : 0), 0)
    created.push({
      id: makeId('STL'),
      party: 'shop',
      partyId: shop.id,
      partyName: shop.name,
      period,
      grossSales,
      commission,
      refunds: 0,
      codCollected,
      payout: grossSales - commission + codCollected,
      status: 'pending',
    })
  }

  for (const rider of riders) {
    if (pendingParties.has(`rider:${rider.id}`)) continue
    const delivered = jobs.filter((job) => job.riderId === rider.id && job.status === 'delivered')
    if (!delivered.length) continue
    const payout = delivered.reduce((sum, job) => sum + job.payout, 0)
    if (payout <= 0) continue
    created.push({
      id: makeId('STL'),
      party: 'rider',
      partyId: rider.id,
      partyName: rider.name,
      period,
      grossSales: 0,
      commission: 0,
      refunds: 0,
      codCollected: delivered.reduce((sum, job) => sum + job.codAmount, 0),
      payout,
      status: 'pending',
    })
  }

  if (created.length) {
    useSettlementStore.getState().addSettlements(created)
    useToastStore.getState().push({
      title: 'Settlement cycle completed',
      message: `${created.length} new statements created from delivered orders and jobs.`,
      tone: 'success',
    })
    log({
      actor: 'System',
      role: 'system',
      action: 'Settlement cycle run',
      targetType: 'settlement',
      targetLabel: period,
      description: `Generated ${created.length} draft settlements from delivered demo orders.`,
    })
  } else {
    useToastStore.getState().push({
      title: 'Nothing new to settle',
      message: 'Every delivered shop order and rider job already has a pending statement.',
      tone: 'info',
    })
  }

  return created.length
}

export function pendingSettlementTotal(settlements: Settlement[]): number {
  return settlements
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.payout, 0)
}

export function settlementFor(settlements: Settlement[], party: 'shop' | 'rider', partyId: string) {
  return settlements.filter((item) => item.party === party && item.partyId === partyId)
}
