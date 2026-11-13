/**
 * Typed access to Vite environment variables.
 *
 * The app is fully functional in demo mode without any keys.
 * Services check `integrationStatus` to decide between the local mock
 * implementation and a future real integration.
 */

const raw = import.meta.env

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function num(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const envConfig = {
  appName: str(raw.VITE_APP_NAME, 'LocalizeIt'),
  appEnv: str(raw.VITE_APP_ENV, 'development'),
  demoMode: str(raw.VITE_DEMO_MODE, 'false') === 'true',

  supabase: {
    url: str(raw.VITE_SUPABASE_URL),
    anonKey: str(raw.VITE_SUPABASE_ANON_KEY),
    serviceRoleKey: str(raw.VITE_SUPABASE_SERVICE_ROLE_KEY),
  },
  razorpay: {
    keyId: str(raw.VITE_RAZORPAY_KEY_ID),
    keySecret: str(raw.VITE_RAZORPAY_KEY_SECRET),
  },
  ai: {
    provider: str(raw.VITE_AI_PROVIDER, 'groq'),
    apiKey: str(raw.VITE_AI_API_KEY),
    baseUrl: str(raw.VITE_AI_BASE_URL),
    model: str(raw.VITE_AI_MODEL),
    groqApiKey: str(raw.VITE_GROQ_API_KEY),
    huggingFaceApiKey: str(raw.VITE_HUGGINGFACE_API_KEY),
    openRouterApiKey: str(raw.VITE_OPENROUTER_API_KEY),
    geminiApiKey: str(raw.VITE_GEMINI_API_KEY),
  },
  maps: {
    apiKey: str(raw.VITE_MAPS_API_KEY),
    geocodingKey: str(raw.VITE_GEOCODING_API_KEY),
    openRouteServiceKey: str(raw.VITE_OPENROUTESERVICE_API_KEY),
  },
  notifications: {
    smsKey: str(raw.VITE_SMS_API_KEY),
    whatsappKey: str(raw.VITE_WHATSAPP_API_KEY),
  },
  demoFees: {
    platformFee: num(raw.VITE_PLATFORM_FEE, 30),
    freeFeeAbove: num(raw.VITE_PLATFORM_FEE_THRESHOLD, 500),
    deliveryFeeNear: num(raw.VITE_DELIVERY_FEE_NEAR, 30),
    deliveryFeeFar: num(raw.VITE_DELIVERY_FEE_FAR, 50),
  },
} as const

/**
 * Real integrations are considered "connected" only when a key is present.
 * The whole demo currently runs with every flag false.
 */
export const integrationStatus = {
  supabase: Boolean(envConfig.supabase.url && envConfig.supabase.anonKey),
  payments: Boolean(envConfig.razorpay.keyId),
  ai: Boolean(
    (envConfig.ai.apiKey && envConfig.ai.baseUrl) ||
      envConfig.ai.groqApiKey ||
      envConfig.ai.huggingFaceApiKey ||
      envConfig.ai.openRouterApiKey ||
      envConfig.ai.geminiApiKey,
  ),
  maps: Boolean(envConfig.maps.apiKey || envConfig.maps.openRouteServiceKey),
  notifications: Boolean(envConfig.notifications.smsKey || envConfig.notifications.whatsappKey),
} as const

export const isDemoMode = envConfig.demoMode

export const integrationLabels: Record<keyof typeof integrationStatus, string> = {
  supabase: 'Supabase database',
  payments: 'Razorpay payments',
  ai: 'LocalizeIt AI',
  maps: 'Maps & geocoding',
  notifications: 'SMS / WhatsApp',
}
