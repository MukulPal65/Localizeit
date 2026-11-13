// Supabase Edge Function: verify a Razorpay signature and atomically finalize
// the checkout. Secrets required: RAZORPAY_KEY_SECRET.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keySecret) return json({ ok: false, error: 'Razorpay is not configured.' }, 503)

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
    const orderId = String(body.razorpay_order_id ?? '')
    const paymentId = String(body.razorpay_payment_id ?? '')
    const signature = String(body.razorpay_signature ?? '')

    if (!intentId || !orderId || !paymentId || !signature) {
      return json({ ok: false, error: 'Missing payment verification fields.' }, 400)
    }

    const { data: intent } = await admin
      .from('checkout_intents')
      .select('*')
      .eq('id', intentId)
      .maybeSingle()
    if (!intent) return json({ ok: false, error: 'Checkout intent not found.' }, 404)
    if (intent.buyer_id !== profile.id) return json({ ok: false, error: 'Not your checkout.' }, 403)
    if (intent.gateway_order_id !== orderId) {
      return json({ ok: false, error: 'Payment does not match this checkout.' }, 409)
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const digest = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${orderId}|${paymentId}`),
    )
    const expected = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (expected !== signature) {
      await admin.from('checkout_intents').update({ status: 'failed' }).eq('id', intentId)
      return json({ ok: false, error: 'Payment signature verification failed.' }, 400)
    }

    const { data: marked, error: markError } = await admin.rpc('mark_intent_paid', {
      p_intent_id: intentId,
      p_gateway_order_id: orderId,
      p_gateway_payment_id: paymentId,
    })
    if (markError || !marked?.ok) {
      return json({ ok: false, error: markError?.message ?? marked?.error ?? 'Could not record payment.' }, 409)
    }

    const { data: finalized, error: finalizeError } = await admin.rpc('finalize_checkout', {
      p_intent_id: intentId,
      p_payment_ref: paymentId,
    })
    if (finalizeError || !finalized?.ok) {
      return json(
        { ok: false, error: finalizeError?.message ?? finalized?.error ?? 'Could not place order.' },
        409,
      )
    }

    return json({ ok: true, checkout_id: finalized.checkout_id, amount: finalized.amount })
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
