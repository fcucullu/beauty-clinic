'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import type { Payment, PaymentWithDetails } from '@/types/database'

interface Stats {
  totalRevenue: number
  monthRevenue: number
  avgTicket: number
  totalAppointments: number
  completedAppointments: number
  occupancyRate: number
  revenueByService: { name: string; total: number; count: number }[]
  revenueByProfessional: { name: string; total: number; count: number }[]
  monthlyTrend: { month: string; revenue: number }[]
}

export default function FinancesPage() {
  const tenant = useTenant()
  const [stats, setStats] = useState<Stats | null>(null)
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    loadData()
  }, [tenant.id, period])

  async function loadData() {
    const supabase = createClient()
    const now = new Date()
    let startDate: Date

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    const [paymentsRes, appointmentsRes, allPaymentsRes] = await Promise.all([
      supabase
        .from('bloom_payments')
        .select('*, client:bloom_users!bloom_payments_client_id_fkey(*)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('bloom_appointments')
        .select('*, service:bloom_services(*), professional:bloom_professionals(*, user:bloom_users(*))')
        .eq('tenant_id', tenant.id)
        .gte('start_time', startDate.toISOString()),
      supabase
        .from('bloom_payments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed'),
    ])

    const periodPayments = paymentsRes.data || []
    const allPayments = allPaymentsRes.data || []
    const appointments = appointmentsRes.data || []

    const totalRevenue = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const monthRevenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const completedApts = appointments.filter(a => a.status === 'completed')
    const avgTicket = periodPayments.length > 0 ? monthRevenue / periodPayments.length : 0

    // Revenue by service
    const serviceMap = new Map<string, { name: string; total: number; count: number }>()
    for (const apt of completedApts) {
      const name = apt.service?.name || 'Otro'
      const price = Number(apt.service?.price || 0)
      const existing = serviceMap.get(name) || { name, total: 0, count: 0 }
      existing.total += price
      existing.count += 1
      serviceMap.set(name, existing)
    }

    // Revenue by professional
    const profMap = new Map<string, { name: string; total: number; count: number }>()
    for (const apt of completedApts) {
      const name = apt.professional?.user?.full_name || 'Otro'
      const price = Number(apt.service?.price || 0)
      const existing = profMap.get(name) || { name, total: 0, count: 0 }
      existing.total += price
      existing.count += 1
      profMap.set(name, existing)
    }

    setStats({
      totalRevenue,
      monthRevenue,
      avgTicket,
      totalAppointments: appointments.length,
      completedAppointments: completedApts.length,
      occupancyRate: appointments.length > 0 ? Math.round((completedApts.length / appointments.length) * 100) : 0,
      revenueByService: [...serviceMap.values()].sort((a, b) => b.total - a.total),
      revenueByProfessional: [...profMap.values()].sort((a, b) => b.total - a.total),
      monthlyTrend: [],
    })

    setPayments(periodPayments)
    setLoading(false)
  }

  function exportCSV() {
    const headers = 'Fecha,Cliente,Descripcion,Tipo,Monto,Moneda\n'
    const rows = payments.map(p =>
      `${new Date(p.created_at).toLocaleDateString('es-ES')},${p.client?.full_name || ''},${p.description || ''},${p.type},${p.amount},${p.currency}`
    ).join('\n')
    const csv = headers + rows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bloom-finanzas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const periodLabel = period === 'month' ? 'Este mes' : period === 'quarter' ? 'Este trimestre' : 'Este ano'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
              >
                {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>Exportar CSV</Button>
        </div>
      </div>

      {loading || !stats ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-500">Ingresos ({periodLabel.toLowerCase()})</p>
                <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.monthRevenue.toFixed(0)}&euro;</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-500">Ticket medio</p>
                <p className="text-2xl font-bold text-[var(--color-secondary)]">{stats.avgTicket.toFixed(0)}&euro;</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-500">Citas completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedAppointments}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-500">Tasa completadas</p>
                <p className="text-2xl font-bold text-[var(--color-accent)]">{stats.occupancyRate}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Service */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Ingresos por Servicio</h2>
              </CardHeader>
              <CardContent>
                {stats.revenueByService.length === 0 ? (
                  <p className="text-gray-400 py-4">Sin datos para este periodo</p>
                ) : (
                  <div className="space-y-3">
                    {stats.revenueByService.map((item) => {
                      const maxTotal = stats.revenueByService[0]?.total || 1
                      return (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="font-medium">{item.total.toFixed(0)}&euro; ({item.count} citas)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-primary)] rounded-full"
                              style={{ width: `${(item.total / maxTotal) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Professional */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Ingresos por Profesional</h2>
              </CardHeader>
              <CardContent>
                {stats.revenueByProfessional.length === 0 ? (
                  <p className="text-gray-400 py-4">Sin datos para este periodo</p>
                ) : (
                  <div className="space-y-3">
                    {stats.revenueByProfessional.map((item) => {
                      const maxTotal = stats.revenueByProfessional[0]?.total || 1
                      return (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="font-medium">{item.total.toFixed(0)}&euro; ({item.count} citas)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-secondary)] rounded-full"
                              style={{ width: `${(item.total / maxTotal) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Ultimos Pagos</h2>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-gray-400 py-4">Sin pagos en este periodo</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.slice(0, 20).map((payment) => (
                    <div key={payment.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{payment.client?.full_name}</p>
                        <p className="text-xs text-gray-500">{payment.description || payment.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{Number(payment.amount).toFixed(2)}&euro;</p>
                        <p className="text-xs text-gray-400">
                          {new Date(payment.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
