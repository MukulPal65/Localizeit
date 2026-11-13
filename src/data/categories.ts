import type { Category } from '@/types'

export const categories: Category[] = [
  { id: 'kirana', name: 'Kirana & Grocery', slug: 'kirana', emoji: '🌾', tint: 'from-orange-100 to-cream-2' },
  { id: 'dairy', name: 'Dairy & Sweets', slug: 'dairy', emoji: '🥛', tint: 'from-cream-2 to-orange-50' },
  { id: 'vegetables', name: 'Fruits & Vegetables', slug: 'vegetables', emoji: '🥬', tint: 'from-success-soft to-cream-2' },
  { id: 'stationery', name: 'Stationery', slug: 'stationery', emoji: '✏️', tint: 'from-info-soft to-cream-2' },
  { id: 'pharmacy', name: 'Pharmacy', slug: 'pharmacy', emoji: '💊', tint: 'from-info-soft to-orange-50' },
  { id: 'hardware', name: 'Hardware & Paints', slug: 'hardware', emoji: '🔨', tint: 'from-cream-3 to-cream-2' },
  { id: 'fashion', name: 'Sarees & Handloom', slug: 'fashion', emoji: '🧵', tint: 'from-orange-100 to-cream-3' },
  { id: 'electronics', name: 'Mobile & Electronics', slug: 'electronics', emoji: '📱', tint: 'from-cream-2 to-info-soft' },
  { id: 'bakery', name: 'Bakery', slug: 'bakery', emoji: '🍞', tint: 'from-orange-50 to-cream-3' },
  { id: 'agriculture', name: 'Agri & Seeds', slug: 'agriculture', emoji: '🌱', tint: 'from-success-soft to-cream-2' },
]

export const categoryById = (id: string) => categories.find((c) => c.id === id)

export const categoryName = (id: string) => categoryById(id)?.name ?? 'General'

export const categoryEmoji = (id: string) => categoryById(id)?.emoji ?? '🛍️'

/** Soft gradient used for product image placeholders. */
export const categoryGradient = (id: string) => categoryById(id)?.tint ?? 'from-cream-2 to-cream-3'
