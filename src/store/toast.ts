import { create } from 'zustand'
import { makeId } from '@/utils'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  message?: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  push: (toast: { title: string; message?: string; tone?: ToastTone }) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ title, message, tone = 'success' }) => {
    const id = makeId('TOAST')
    set((s) => ({ toasts: [...s.toasts, { id, title, message, tone }] }))
    window.setTimeout(() => get().dismiss(id), 3600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Small helper usable outside React components. */
export const toast = (title: string, message?: string, tone: ToastTone = 'success') =>
  useToastStore.getState().push({ title, message, tone })
