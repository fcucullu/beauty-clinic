'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { Plan, PlanSubscriptionWithDetails } from '@/types/database'

export default function MyPlansPage() {
  const tenant = useTenant()
  const { dbUser, loading: userLoading } = useUser()
  const [mySubscriptions, setMySubscriptions] = useState<PlanSubscriptionWithDetails[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'browse'>('active')
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    if (!dbUser) return
    async function load() {
      const supabase = createClient()
      const [subsRes, plansRes] = await Promise.all([
        supabase
          .from('bloom_plan_subscriptions')
          .select('*, plan:bloom_plans(*), client:bloom_users!bloom_plan_subscriptions_client_id_fkey(*)')
          .eq('tenant_id', tenant.id)
          .eq('client_id', dbUser!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('bloom_plans')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('price'),
      ])
      setMySubscriptions(subsRes.data || [])
      setAvailablePlans(plansRes.data || [])
      setLoading(false)
    }
    load()
  }, [tenant.id, dbUser])

  async function handlePurchase(plan: Plan) {
    if (!dbUser) return
    setPurchasing(plan.id)

    // For now, create subscription directly (Stripe integration will handle payment)
    const supabase = createClient()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + plan.validity_days)

    const { data: sub } = await supabase.from('bloom_plan_subscriptions').insert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      client_id: dbUser.id,
      sessions_used: 0,
      sessions_total: plan.total_sessions,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    }).select('*').single()

    if (sub) {
      await supabase.from('bloom_payments').insert({
        tenant_id: tenant.id,
        client_id: dbUser.id,
        amount: plan.price,
        currency: plan.currency,
        type: 'plan_purchase',
        status: 'completed',
        plan_subscription_id: sub.id,
        description: plan.name,
      })

      // Reload
      const { data: updatedSubs } = await supabase
        .from('bloom_plan_subscriptions')
        .select('*, plan:bloom_plans(*), client:bloom_users!bloom_plan_subscriptions_client_id_fkey(*)')
        .eq('tenant_id', tenant.id)
        .eq('client_id', dbUser.id)
        .order('created_at', { ascending: false })
      setMySubscriptions(updatedSubs || [])
      setTab('active')
    }
    setPurchasing(null)
  }

  if (userLoading || loading) {
    return <p className="text-gray-400 py-8 text-center">Cargando...</p>
  }

  const activeSubs = mySubscriptions.filter((s) => s.status === 'active')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mis Planes</h1>

      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${tab === 'active' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
        >
          Activos ({activeSubs.length})
        </button>
        <button
          onClick={() => setTab('browse')}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${tab === 'browse' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
        >
          Comprar
        </button>
      </div>

      {tab === 'active' ? (
        activeSubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-gray-400">No tienes planes activos</p>
              <Button variant="outline" onClick={() => setTab('browse')}>Ver planes disponibles</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeSubs.map((sub) => {
              const pct = (sub.sessions_used / sub.sessions_total) * 100
              const remaining = sub.sessions_total - sub.sessions_used
              const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              return (
                <Card key={sub.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{sub.plan?.name}</h3>
                        <p className="text-sm text-gray-500">{sub.plan?.description}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Sesiones usadas</span>
                        <span className="font-medium">{sub.sessions_used} / {sub.sessions_total}</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct > 80 ? '#EF4444' : 'var(--color-primary)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{remaining} sesiones restantes</span>
                      <span>{daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado'}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {availablePlans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-sm text-gray-400">
                      <span>{plan.total_sessions} sesiones</span>
                      <span>Valido {plan.validity_days} dias</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-[var(--color-primary)]">{plan.price}&euro;</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => handlePurchase(plan)}
                      loading={purchasing === plan.id}
                    >
                      Comprar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
