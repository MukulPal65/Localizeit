import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { ToastHost } from '@/components/ui/ToastHost'
import { initRealtimeSubscriptions, loadAuthenticatedProfile, loadCatalogFromSupabase, loadLiveOperationalData } from '@/services/supabaseService'
import { initCrossTabSync } from '@/services/crossTabSync'
import { useLocationStore } from '@/store/location'
import { useFeeStore } from '@/store/fees'
import { useSettlementStore } from '@/store/settlements'
import { useOrderStore } from '@/store/orders'
import { useActivityStore } from '@/store/activity'
import { useSettingsStore } from '@/store/settings'
import { useBuyerStore } from '@/store/buyer'
import { useCatalogStore } from '@/store/catalog'
import { useCartStore } from '@/store/cart'
import { useDeliveryStore } from '@/store/delivery'
import { isDemoMode } from '@/config/env'
import { seedDemoDataIfEmpty } from '@/data/demoSeed'
import '@/styles.css'

if (isDemoMode) seedDemoDataIfEmpty()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('LocalizeIt offline shell could not be registered:', error)
    })
  })
}

void Promise.all([loadCatalogFromSupabase(), loadLiveOperationalData(), loadAuthenticatedProfile()])
  .then(() => initRealtimeSubscriptions())
  .catch((error) => {
    console.error('Unable to initialize the live catalogue:', error)
  })

initCrossTabSync([
  useLocationStore,
  useFeeStore,
  useSettlementStore,
  useOrderStore,
  useActivityStore,
  useSettingsStore,
  useBuyerStore,
  useCatalogStore,
  useCartStore,
  useDeliveryStore,
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ToastHost />
  </StrictMode>,
)
