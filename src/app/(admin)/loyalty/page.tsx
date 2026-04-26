'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'

interface ClientPoints {
  client_id: string
  full_name: string
  total_points: number
}

interface Reward {
  id: string
  name: string
  description: string | null
  points_cost: number
  type: string
  is_active: boolean
}

export default function LoyaltyPage() {
  const tenant = useTenant()
  const [rankings, setRankings] = useState<ClientPoints[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rankings' | 'rewards'>('rankings')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', points_cost: 500, type: 'discount_percent' })

  useEffect(() => {
    loadData()
  }, [tenant.id])

  async function loadData() {
    const supabase = createClient()

    // Get all points grouped by client
    const { data: points } = await supabase
      .from('bloom_loyalty_points')
      .select('client_id, points, bloom_users!inner(full_name)')
      .eq('tenant_id', tenant.id)

    // Aggregate points per client
    const clientMap = new Map<string, { full_name: string; total: number }>()
    for (const p of (points || [])) {
      const name = (p as any).bloom_users?.full_name || 'Unknown'
      const existing = clientMap.get(p.client_id) || { full_name: name, total: 0 }
      existing.total += p.points
      clientMap.set(p.client_id, existing)
    }
    const sorted = [...clientMap.entries()]
      .map(([client_id, { full_name, total }]) => ({ client_id, full_name, total_points: total }))
      .sort((a, b) => b.total_points - a.total_points)
    setRankings(sorted)

    const { data: rewardsData } = await supabase
      .from('bloom_loyalty_rewards')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('points_cost')
    setRewards(rewardsData || [])

    setLoading(false)
  }

  async function handleCreateReward() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('bloom_loyalty_rewards').insert({
      tenant_id: tenant.id,
      name: form.name,
      description: form.description || null,
      points_cost: form.points_cost,
      type: form.type,
      is_active: true,
    })
    setModalOpen(false)
    setSaving(false)
    setForm({ name: '', description: '', points_cost: 500, type: 'discount_percent' })
    loadData()
  }

  async function handleDeleteReward(id: string) {
    const supabase = createClient()
    await supabase.from('bloom_loyalty_rewards').update({ is_active: false }).eq('id', id)
    loadData()
  }

  const totalPointsIssued = rankings.reduce((sum, r) => sum + Math.max(0, r.total_points), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fidelizacion</h1>
        <Button onClick={() => setModalOpen(true)}>Nueva Recompensa</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Clientes con puntos</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{rankings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Puntos en circulacion</p>
            <p className="text-2xl font-bold text-[var(--color-secondary)]">{totalPointsIssued}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Recompensas activas</p>
            <p className="text-2xl font-bold text-[var(--color-accent)]">{rewards.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
        <button onClick={() => setTab('rankings')} className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === 'rankings' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
          Ranking ({rankings.length})
        </button>
        <button onClick={() => setTab('rewards')} className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === 'rewards' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
          Recompensas ({rewards.length})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : tab === 'rankings' ? (
        <Card>
          <CardContent>
            {rankings.length === 0 ? (
              <p className="text-gray-400 py-8 text-center">Sin datos de fidelizacion</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {rankings.map((client, i) => (
                  <div key={client.client_id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="font-medium text-gray-900">{client.full_name}</span>
                    </div>
                    <span className="font-bold text-[var(--color-primary)]">{client.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewards.map((reward) => (
            <Card key={reward.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                    {reward.description && <p className="text-sm text-gray-500 mt-1">{reward.description}</p>}
                  </div>
                  <span className="text-sm font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-lg">
                    {reward.points_cost} pts
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteReward(reward.id)}>Eliminar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Recompensa">
        <div className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: 10% Descuento" />
          <Input label="Descripcion" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion de la recompensa" />
          <Input label="Coste en puntos" type="number" value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: parseInt(e.target.value) || 0 })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="discount_percent">Descuento %</option>
              <option value="discount_fixed">Descuento EUR</option>
              <option value="free_service">Servicio gratis</option>
              <option value="free_product">Producto gratis</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateReward} loading={saving} disabled={!form.name || !form.points_cost}>Crear</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
