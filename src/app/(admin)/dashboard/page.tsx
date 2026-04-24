'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import type { AppointmentWithDetails } from '@/types/database'

export default function DashboardPage() {
  const tenant = useTenant()
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithDetails[]>([])
  const [stats, setStats] = useState({ today: 0, week: 0, clients: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      const { data: appointments } = await supabase
        .from('bloom_appointments')
        .select(`
          *,
          client:bloom_users!bloom_appointments_client_id_fkey(*),
          professional:bloom_professionals!bloom_appointments_professional_id_fkey(*, user:bloom_users(*)),
          service:bloom_services(*)
        `)
        .eq('tenant_id', tenant.id)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .order('start_time')

      setTodayAppointments(appointments || [])

      const { count: clientCount } = await supabase
        .from('bloom_users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('role', 'client')

      setStats({
        today: appointments?.length || 0,
        week: 0,
        clients: clientCount || 0,
        revenue: 0,
      })
      setLoading(false)
    }
    load()
  }, [tenant.id])

  const statCards = [
    { label: 'Citas hoy', value: stats.today, color: 'text-[var(--color-primary)]' },
    { label: 'Citas esta semana', value: stats.week, color: 'text-[var(--color-secondary)]' },
    { label: 'Clientes', value: stats.clients, color: 'text-[var(--color-accent)]' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">{tenant.welcome_message || `Bienvenido a ${tenant.name}`}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-5">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>
                {loading ? '-' : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Citas de hoy</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400 py-4">Cargando...</p>
          ) : todayAppointments.length === 0 ? (
            <p className="text-gray-400 py-4">No hay citas programadas para hoy</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{apt.client?.full_name}</p>
                    <p className="text-sm text-gray-500">{apt.service?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {new Date(apt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status === 'confirmed' ? 'Confirmada' :
                       apt.status === 'pending' ? 'Pendiente' :
                       apt.status === 'cancelled' ? 'Cancelada' : apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
