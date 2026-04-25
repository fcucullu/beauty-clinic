import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'

// Use service role key for webhook handler (no user context)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { plan_id, tenant_id, client_id, sessions_total, validity_days } = session.metadata || {}

    if (plan_id && tenant_id && client_id) {
      const supabase = getAdminClient()

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(validity_days || '365'))

      // Create subscription
      const { data: sub } = await supabase.from('bloom_plan_subscriptions').insert({
        tenant_id,
        plan_id,
        client_id,
        sessions_used: 0,
        sessions_total: parseInt(sessions_total || '0'),
        status: 'active',
        expires_at: expiresAt.toISOString(),
        stripe_payment_intent_id: session.payment_intent as string,
      }).select().single()

      // Record payment
      if (sub) {
        await supabase.from('bloom_payments').insert({
          tenant_id,
          client_id,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || 'EUR',
          type: 'plan_purchase',
          status: 'completed',
          plan_subscription_id: sub.id,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_checkout_session_id: session.id,
          description: `Plan purchase: ${plan_id}`,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
