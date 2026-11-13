// Supabase Edge Function: create a Razorpay order for a stored checkout intent.
// Secrets required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) {
      return json({ ok: false, error: 'Razorpay is not configured on the server.' }, 503)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ ok: false, error: 'Sign in required.' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('auth_id', userData.user.id)
      .maybeSingle()
    if (!profile) return json({ ok: false, error: 'Profile not found.' }, 403)

    const body = await req.json()
    const intentId = String(body.intent_id ?? '')
    if (!intentId) return json({ ok: false, error: 'intent_id is required.' }, 400)

    const { data: intent, error: intentError } = await admin
      .from('checkout_intents')
      .select('*')
      .eq('id', intentId)
      .maybeSingle()
    if (intentError || !intent) return json({ ok: false, error: 'Checkout intent not found.' }, 404)
    if (intent.buyer_id !== profile.id) return json({ ok: false, error: 'Not your checkout.' }, 403)
    if (intent.status !== 'created') return json({ ok: false, error: 'This checkout is no longer open.' }, 409)
    if (new Date(intent.expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: 'Checkout expired. Please refresh your cart.' }, 409)
    }

    const amountPaise = Math.round(Number(intent.amount) * 100)
    const receipt = `lz_${String(intent.id).replace(/-/g, '').slice(0, 24)}`

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { intent_id: intent.id, buyer_id: intent.buyer_id },
      }),
    })

    const rzp = await rzpRes.json()
    if (!rzpRes.ok) {
      return json({ ok: false, error: rzp?.error?.description ?? 'Razorpay order creation failed.' }, 502)
    }

    await admin.from('checkout_intents').update({ gateway_order_id: rzp.id }).eq('id', intent.id)

    return json({ ok: true, key_id: keyId, order_id: rzp.id, amount: intent.amount, currency: 'INR' })
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Unexpected error.' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
