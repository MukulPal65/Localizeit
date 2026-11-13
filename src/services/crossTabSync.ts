type PersistedStore = {
  persist?: {
    rehydrate: () => void | Promise<void>
  }
}

const persistedKeys = [
  'lz-location',
  'lz-fees',
  'lz-settlements',
  'lz-orders',
  'lz-activity',
  'lz-settings',
  'lz-buyer',
  'lz-catalog',
  'lz-cart',
  'lz-delivery',
]

export function initCrossTabSync(stores: PersistedStore[]): () => void {
  if (typeof window === 'undefined') return () => undefined

  const rehydrate = (key: string | null) => {
    if (key && !persistedKeys.includes(key)) return
    stores.forEach((store) => {
      void store.persist?.rehydrate()
    })
  }

  const onStorage = (event: StorageEvent) => rehydrate(event.key)
  window.addEventListener('storage', onStorage)

  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('localizeit-sync') : null
  const onMessage = (event: MessageEvent<{ key?: string }>) => rehydrate(event.data?.key ?? null)
  channel?.addEventListener('message', onMessage)

  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', onMessage)
    channel?.close()
  }
}
