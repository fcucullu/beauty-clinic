'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { AppointmentWithDetails } from '@/types/database'

export default function MyAppointmentsPage() {
  const tenant = useTenant()
  const { dbUser, loading: userLoading } = useUser()
  const [upcoming, setUpcoming] = useState<AppointmentWithDetails[]>([])
  const [past, setPast] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    if (!dbUser) return
    async function load() {
      const supabase = createClient()
      const now = new Date().toISOString()

      const [upRes, pastRes] = await Promise.all([
        supabase
          .from('bloom_appointments')
          .select('*, professional:bloom_professionals!bloom_appointments_professional_id_fkey(*, user:bloom_users(*)), service:bloom_services(*), client:bloom_users!bloom_appointments_client_id_fkey(*)')
          .eq('tenant_id', tenant.id)
          .eq('client_id', dbUser!.id)
          .gte('start_time', now)
          .neq('status', 'cancelled')
          .order('start_time'),
        supabase
          .from('bloom_appointments')
          .select('*, professional:bloom_professionals!bloom_appointments_professional_id_fkey(*, user:bloom_users(*)), service:bloom_services(*), client:bloom_users!bloom_appointments_client_id_fkey(*)')
          .eq('tenant_id', tenant.id)
          .eq('client_id', dbUser!.id)
          .lt('start_time', now)
          .order('start_time', { ascending: false })
          .limit(20),
      ])

      setUpcoming(upRes.data || [])
      setPast(pastRes.data || [])
      setLoading(false)
    }
    load()
  }, [tenant.id, dbUser])

  async function cancelAppointment(id: string) {
    const supabase = createClient()
    await supabase.from('bloom_appointments').update({ status: 'cancelled' }).eq('id', id)
    setUpcoming((prev) => prev.filter((a) => a.id !== id))
  }

  if (userLoading || loading) {
    return <p className="text-gray-400 py-8 text-center">Cargando...</p>
  }

  const appointments = tab === 'upcoming' ? upcoming : past

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mis Citas</h1>

      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${tab === 'upcoming' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
        >
          Proximas ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${tab === 'past' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
        >
          Pasadas
        </button>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">
              {tab === 'upcoming' ? 'No tienes citas proximas' : 'No tienes citas pasadas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{apt.service?.name}</h3>
                    <p className="text-sm text-gray-500">con {apt.professional?.user?.full_name}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(apt.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {' '}a las {new Date(apt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {tab === 'upcoming' && (
                      <Button size="sm" variant="ghost" onClick={() => cancelAppointment(apt.id)}>
                        Cancelar
                      </Button>
                    )}
                    {tab === 'past' && (
                      <a
                        href={`/api/invoice/${apt.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        Factura
                      </a>
                    )}
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
