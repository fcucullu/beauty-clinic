'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'

interface Reward {
  id: string
  name: string
  description: string | null
  points_cost: number
  type: string
}

interface PointEntry {
  id: string
  points: number
  type: string
  description: string | null
  created_at: string
}

export default function RewardsPage() {
  const tenant = useTenant()
  const { dbUser, loading: userLoading } = useUser()
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState<PointEntry[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [tab, setTab] = useState<'rewards' | 'history'>('rewards')

  useEffect(() => {
    if (!dbUser) return
    async function load() {
      const supabase = createClient()

      const [pointsRes, rewardsRes] = await Promise.all([
        supabase
          .from('bloom_loyalty_points')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('client_id', dbUser!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('bloom_loyalty_rewards')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('points_cost'),
      ])

      const points = pointsRes.data || []
      const total = points.reduce((sum, p) => sum + p.points, 0)
      setBalance(total)
      setHistory(points)
      setRewards(rewardsRes.data || [])
      setLoading(false)
    }
    load()
  }, [tenant.id, dbUser])

  async function handleRedeem(reward: Reward) {
    if (!dbUser || balance < reward.points_cost) return
    setRedeeming(reward.id)
    const supabase = createClient()

    await supabase.from('bloom_loyalty_points').insert({
      tenant_id: tenant.id,
      client_id: dbUser.id,
      points: -reward.points_cost,
      type: 'redeemed',
      description: `Canje: ${reward.name}`,
    })

    setBalance((prev) => prev - reward.points_cost)
    setHistory((prev) => [{
      id: crypto.randomUUID(),
      points: -reward.points_cost,
      type: 'redeemed',
      description: `Canje: ${reward.name}`,
      created_at: new Date().toISOString(),
    }, ...prev])
    setRedeeming(null)
  }

  const referralCode = dbUser?.referral_code || ''

  function copyReferral() {
    navigator.clipboard.writeText(referralCode)
  }

  if (userLoading || loading) {
    return <p className="text-gray-400 py-8 text-center">Cargando...</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mis Recompensas</h1>

      {/* Points balance */}
      <Card className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]">
        <CardContent className="py-6 text-center text-white">
          <p className="text-sm opacity-80">Tu saldo de puntos</p>
          <p className="text-4xl font-bold mt-1">{balance}</p>
          <p className="text-sm opacity-80 mt-1">puntos disponibles</p>
        </CardContent>
      </Card>

      {/* Referral code */}
      {referralCode && (
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tu codigo de referido</p>
              <p className="font-mono font-bold text-lg text-[var(--color-primary)]">{referralCode}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copyReferral}>Copiar</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button onClick={() => setTab('rewards')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${tab === 'rewards' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
          Canjear
        </button>
        <button onClick={() => setTab('history')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${tab === 'history' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
          Historial
        </button>
      </div>

      {tab === 'rewards' ? (
        <div className="space-y-3">
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-400">No hay recompensas disponibles</p>
              </CardContent>
            </Card>
          ) : rewards.map((reward) => {
            const canAfford = balance >= reward.points_cost
            return (
              <Card key={reward.id} className={!canAfford ? 'opacity-50' : ''}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{reward.name}</h3>
                    {reward.description && <p className="text-sm text-gray-500">{reward.description}</p>}
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-[var(--color-primary)]">{reward.points_cost} pts</p>
                    <Button
                      size="sm"
                      className="mt-1"
                      disabled={!canAfford}
                      loading={redeeming === reward.id}
                      onClick={() => handleRedeem(reward)}
                    >
                      Canjear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-400">Sin movimientos de puntos</p>
              </CardContent>
            </Card>
          ) : history.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{entry.description || entry.type}</p>
                  <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <span className={`font-bold text-sm ${entry.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {entry.points > 0 ? '+' : ''}{entry.points}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
