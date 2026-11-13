import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order, OrderStatus } from '@/types'
import { seedOrders } from '@/data/orders'
import { nowISO } from '@/utils'

interface OrderState {
  orders: Order[]
  addOrder: (order: Order) => void
  setShopOrderStatus: (
    orderId: string,
    shopOrderId: string,
    status: OrderStatus,
    opts?: { note?: string; rejectionReason?: string; riderId?: string },
  ) => void
  setShopOrderRider: (orderId: string, shopOrderId: string, riderId: string) => void
  setShopOrderNote: (orderId: string, shopOrderId: string, note: string) => void
  resetOrders: () => void
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: seedOrders,
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      setShopOrderStatus: (orderId, shopOrderId, status, opts = {}) =>
        set((s) => ({
          orders: s.orders.map((order) => {
            if (order.id !== orderId) return order
            return {
              ...order,
              shopOrders: order.shopOrders.map((so) => {
                if (so.id !== shopOrderId) return so
                const history =
                  so.status === status
                    ? so.statusHistory
                    : [
                        ...so.statusHistory,
                        {
                          status,
                          at: nowISO(),
                          note: opts.note ?? opts.rejectionReason,
                        },
                      ]
                return {
                  ...so,
                  status,
                  statusHistory: history,
                  rejectionReason: opts.rejectionReason ?? so.rejectionReason,
                  riderId: opts.riderId ?? so.riderId,
                }
              }),
            }
          }),
        })),
      setShopOrderRider: (orderId, shopOrderId, riderId) =>
        set((s) => ({
          orders: s.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  shopOrders: order.shopOrders.map((so) =>
                    so.id === shopOrderId ? { ...so, riderId } : so,
                  ),
                }
              : order,
          ),
        })),
      setShopOrderNote: (orderId, shopOrderId, note) =>
        set((s) => ({
          orders: s.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  shopOrders: order.shopOrders.map((so) =>
                    so.id === shopOrderId ? { ...so, note } : so,
                  ),
                }
              : order,
          ),
        })),
      resetOrders: () => set({ orders: seedOrders }),
    }),
    { name: 'lz-orders' },
  ),
)
