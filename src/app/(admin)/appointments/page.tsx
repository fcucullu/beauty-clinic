'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import type { AppointmentWithDetails, Service, User } from '@/types/database'
import { findGaps } from '@/lib/scheduling/optimizer'

type ViewMode = 'day' | 'week'

export default function AppointmentsPage() {
  const tenant = useTenant()
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [professionals, setProfessionals] = useState<{ id: string; user: { full_name: string } }[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    professional_id: '',
    service_id: '',
    date: '',
    time: '',
  })

  useEffect(() => {
    loadData()
  }, [tenant.id, currentDate, viewMode])

  async function loadData() {
    const supabase = createClient()
    const dateStr = currentDate.toISOString().split('T')[0]

    let startDate = dateStr
    let endDate = dateStr
    if (viewMode === 'week') {
      const start = new Date(currentDate)
      start.setDate(start.getDate() - start.getDay() + 1)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      startDate = start.toISOString().split('T')[0]
      endDate = end.toISOString().split('T')[0]
    }

    const [aptRes, svcRes, clientRes, profRes] = await Promise.all([
      supabase
        .from('bloom_appointments')
        .select(`
          *,
          client:bloom_users!bloom_appointments_client_id_fkey(*),
          professional:bloom_professionals!bloom_appointments_professional_id_fkey(*, user:bloom_users(*)),
          service:bloom_services(*)
        `)
        .eq('tenant_id', tenant.id)
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`)
        .order('start_time'),
      supabase.from('bloom_services').select('*').eq('tenant_id', tenant.id).eq('is_active', true),
      supabase.from('bloom_users').select('*').eq('tenant_id', tenant.id).eq('role', 'client'),
      supabase.from('bloom_professionals').select('*, user:bloom_users!bloom_professionals_user_id_fkey(full_name)').eq('tenant_id', tenant.id).eq('is_active', true),
    ])

    setAppointments(aptRes.data || [])
    setServices(svcRes.data || [])
    setClients(clientRes.data || [])
    setProfessionals(profRes.data || [])
    setLoading(false)
  }

  function navigateDate(dir: number) {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + (viewMode === 'week' ? dir * 7 : dir))
    setCurrentDate(d)
  }

  async function handleCreate() {
    setSaving(true)
    const supabase = createClient()
    const service = services.find((s) => s.id === form.service_id)
    const startTime = `${form.date}T${form.time}:00`
    const endTime = new Date(new Date(startTime).getTime() + (service?.duration_minutes || 60) * 60000).toISOString()

    await supabase.from('bloom_appointments').insert({
      tenant_id: tenant.id,
      client_id: form.client_id,
      professional_id: form.professional_id,
      service_id: form.service_id,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
    })

    setModalOpen(false)
    setSaving(false)
    setForm({ client_id: '', professional_id: '', service_id: '', date: '', time: '' })
    loadData()
  }

  async function handleStatusChange(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('bloom_appointments').update({ status }).eq('id', id)
    loadData()
  }

  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 - 20:00

  const formatDate = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
            >
              Semana
            </button>
          </div>
          <Button onClick={() => setModalOpen(true)}>Nueva Cita</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-700 capitalize">{formatDate(currentDate)}</h2>
        <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="text-gray-400 p-6">Cargando...</p>
          ) : (
            <div className="min-w-[600px]">
              {/* Timeline */}
              <div className="relative">
                {hours.map((hour) => (
                  <div key={hour} className="flex border-b border-gray-50">
                    <div className="w-16 py-3 px-2 text-xs text-gray-400 text-right flex-shrink-0">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 py-3 px-2 min-h-[60px] relative">
                      {appointments
                        .filter((apt) => new Date(apt.start_time).getHours() === hour)
                        .map((apt) => (
                          <div
                            key={apt.id}
                            className={`rounded-lg px-3 py-2 mb-1 text-sm cursor-pointer ${
                              apt.status === 'cancelled' ? 'bg-red-50 border border-red-200' :
                              apt.status === 'completed' ? 'bg-green-50 border border-green-200' :
                              'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{apt.client?.full_name}</span>
                                <span className="text-gray-500 ml-2">{apt.service?.name}</span>
                              </div>
                              <div className="flex gap-1">
                                {apt.status === 'confirmed' && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(apt.id, 'completed')}
                                      className="text-green-600 hover:bg-green-100 p-1 rounded text-xs"
                                    >
                                      Completar
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                      className="text-red-600 hover:bg-red-100 p-1 rounded text-xs"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(apt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} -
                              {new Date(apt.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              {apt.professional?.user?.full_name && ` | ${apt.professional.user.full_name}`}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gaps / Schedule Optimization */}
      {!loading && viewMode === 'day' && (() => {
        const todayApts = appointments.filter(a => a.status !== 'cancelled')
        const gaps = findGaps(todayApts, services)
        const usableGaps = gaps.filter(g => g.minutes >= 15 && g.suggestedServices.length > 0)
        if (usableGaps.length === 0) return null
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--color-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Huecos disponibles</h2>
                <span className="text-sm text-gray-400">({usableGaps.length} detectados)</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usableGaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[var(--color-secondary)]/5 rounded-lg border border-[var(--color-secondary)]/20">
                    <div className="text-center flex-shrink-0">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{gap.start} - {gap.end}</p>
                      <p className="text-xs text-gray-400">{gap.minutes} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Servicios que caben:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gap.suggestedServices.map((s, j) => (
                          <span key={j} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Cita">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.service_id}
              onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            >
              <option value="">Seleccionar servicio...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min - {s.price}&euro;)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profesional</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.professional_id}
              onChange={(e) => setForm({ ...form, professional_id: e.target.value })}
            >
              <option value="">Seleccionar profesional...</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.user.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              loading={saving}
              disabled={!form.service_id || !form.client_id || !form.professional_id || !form.date || !form.time}
            >
              Crear Cita
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
