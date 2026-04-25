import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan_id, tenant_id } = await request.json()

  // Get plan details
  const { data: plan } = await supabase
    .from('bloom_plans')
    .select('*')
    .eq('id', plan_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Get user details
  const { data: dbUser } = await supabase
    .from('bloom_users')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const origin = request.headers.get('origin') || ''

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: plan.name,
            description: plan.description || undefined,
          },
          unit_amount: Math.round(plan.price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      plan_id: plan.id,
      tenant_id: tenant_id,
      client_id: dbUser.id,
      sessions_total: plan.total_sessions.toString(),
      validity_days: plan.validity_days.toString(),
    },
    customer_email: dbUser.email,
    success_url: `${origin}/my-plans?success=true`,
    cancel_url: `${origin}/my-plans?cancelled=true`,
  })

  return NextResponse.json({ url: session.url })
}
