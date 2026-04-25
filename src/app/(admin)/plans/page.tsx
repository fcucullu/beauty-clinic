'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import type { Plan, PlanSubscriptionWithDetails } from '@/types/database'

export default function PlansPage() {
  const tenant = useTenant()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscriptions, setSubscriptions] = useState<PlanSubscriptionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'plans' | 'subscriptions'>('plans')
  const [form, setForm] = useState({
    name: '',
    description: '',
    total_sessions: 10,
    price: 0,
    validity_days: 365,
  })

  useEffect(() => {
    loadData()
  }, [tenant.id])

  async function loadData() {
    const supabase = createClient()
    const [plansRes, subsRes] = await Promise.all([
      supabase.from('bloom_plans').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('name'),
      supabase.from('bloom_plan_subscriptions').select('*, plan:bloom_plans(*), client:bloom_users!bloom_plan_subscriptions_client_id_fkey(*)').eq('tenant_id', tenant.id).order('created_at', { ascending: false }),
    ])
    setPlans(plansRes.data || [])
    setSubscriptions(subsRes.data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditingPlan(null)
    setForm({ name: '', description: '', total_sessions: 10, price: 0, validity_days: 365 })
    setModalOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description || '',
      total_sessions: plan.total_sessions,
      price: plan.price,
      validity_days: plan.validity_days,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    if (editingPlan) {
      await supabase.from('bloom_plans').update({
        name: form.name,
        description: form.description || null,
        total_sessions: form.total_sessions,
        price: form.price,
        validity_days: form.validity_days,
      }).eq('id', editingPlan.id)
    } else {
      await supabase.from('bloom_plans').insert({
        tenant_id: tenant.id,
        name: form.name,
        description: form.description || null,
        total_sessions: form.total_sessions,
        price: form.price,
        validity_days: form.validity_days,
        is_active: true,
      })
    }

    setModalOpen(false)
    setSaving(false)
    loadData()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('bloom_plans').update({ is_active: false }).eq('id', id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Planes y Bonos</h1>
        <Button onClick={openCreate}>Nuevo Plan</Button>
      </div>

      <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === 'plans' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
        >
          Planes ({plans.length})
        </button>
        <button
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === 'subscriptions' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
        >
          Suscripciones ({subscriptions.length})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : tab === 'plans' ? (
        plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">No hay planes. Crea tu primer plan o bono.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <p className="font-bold text-[var(--color-primary)]">{plan.price}&euro;</p>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  )}
                  <div className="flex gap-3 mt-3 text-sm text-gray-400">
                    <span>{plan.total_sessions} sesiones</span>
                    <span>{plan.validity_days} dias</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(plan.id)}>Eliminar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">No hay suscripciones activas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)] font-bold text-sm">
                      {sub.client?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sub.client?.full_name}</p>
                      <p className="text-sm text-gray-500">{sub.plan?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-primary)] rounded-full"
                          style={{ width: `${(sub.sessions_used / sub.sessions_total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{sub.sessions_used}/{sub.sessions_total}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Expira {new Date(sub.expires_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingPlan ? 'Editar Plan' : 'Nuevo Plan'}>
        <div className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Bono 10 Sesiones Laser" />
          <Input label="Descripcion" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion del plan..." />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Sesiones" type="number" value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: parseInt(e.target.value) || 0 })} />
            <Input label="Precio (EUR)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            <Input label="Validez (dias)" type="number" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: parseInt(e.target.value) || 365 })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name || !form.price}>
              {editingPlan ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
