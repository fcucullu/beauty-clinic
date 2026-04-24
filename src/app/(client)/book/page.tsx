'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { Service } from '@/types/database'

type Step = 'service' | 'professional' | 'datetime' | 'confirm'

interface ProfessionalOption {
  id: string
  specialty: string | null
  user: { full_name: string }
}

interface TimeSlot {
  time: string
  available: boolean
}

export default function BookPage() {
  const tenant = useTenant()
  const { dbUser } = useUser()
  const [step, setStep] = useState<Step>('service')
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalOption | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('bloom_services')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('category, name')
      setServices(data || [])
    }
    load()
  }, [tenant.id])

  async function selectService(service: Service) {
    setSelectedService(service)
    const supabase = createClient()
    const { data } = await supabase
      .from('bloom_professionals')
      .select('*, user:bloom_users!bloom_professionals_user_id_fkey(full_name)')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
    setProfessionals(data || [])
    setStep('professional')
  }

  function selectProfessional(prof: ProfessionalOption) {
    setSelectedProfessional(prof)
    setStep('datetime')
  }

  async function selectDate(date: string) {
    setSelectedDate(date)
    setSelectedTime('')

    // Generate time slots based on business hours
    const supabase = createClient()
    const { data: existingApts } = await supabase
      .from('bloom_appointments')
      .select('start_time, end_time')
      .eq('tenant_id', tenant.id)
      .eq('professional_id', selectedProfessional?.id)
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`)
      .neq('status', 'cancelled')

    const bookedTimes = new Set(
      (existingApts || []).map((a) => new Date(a.start_time).toTimeString().slice(0, 5))
    )

    const generatedSlots: TimeSlot[] = []
    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        generatedSlots.push({ time, available: !bookedTimes.has(time) })
      }
    }
    setSlots(generatedSlots)
  }

  async function handleBook() {
    if (!dbUser || !selectedService || !selectedProfessional) return
    setSaving(true)
    const supabase = createClient()
    const startTime = `${selectedDate}T${selectedTime}:00`
    const endMs = new Date(startTime).getTime() + selectedService.duration_minutes * 60000
    const endTime = new Date(endMs).toISOString()

    const { error } = await supabase.from('bloom_appointments').insert({
      tenant_id: tenant.id,
      client_id: dbUser.id,
      professional_id: selectedProfessional.id,
      service_id: selectedService.id,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
    })

    setSaving(false)
    if (!error) {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Cita confirmada</h2>
        <p className="text-gray-500">
          {selectedService?.name} con {selectedProfessional?.user.full_name}
        </p>
        <p className="text-gray-500">
          {selectedDate} a las {selectedTime}
        </p>
        <Button onClick={() => { setSuccess(false); setStep('service'); setSelectedService(null); setSelectedProfessional(null) }}>
          Reservar otra cita
        </Button>
      </div>
    )
  }

  // Get next 14 days for date selection
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Reservar Cita</h1>

      {/* Progress */}
      <div className="flex gap-1">
        {(['service', 'professional', 'datetime', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${
            (['service', 'professional', 'datetime', 'confirm'].indexOf(step) >= i)
              ? 'bg-[var(--color-primary)]'
              : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {step === 'service' && (
        <div className="space-y-3">
          <p className="text-gray-500">Selecciona un servicio</p>
          {services.map((service) => (
            <Card key={service.id} className="cursor-pointer hover:border-[var(--color-primary)]" onClick={() => selectService(service)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.duration_minutes} min</p>
                </div>
                <p className="font-bold text-[var(--color-primary)]">{service.price}&euro;</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === 'professional' && (
        <div className="space-y-3">
          <button onClick={() => setStep('service')} className="text-sm text-[var(--color-primary)]">&larr; Cambiar servicio</button>
          <p className="text-gray-500">Elige tu profesional</p>
          {professionals.map((prof) => (
            <Card key={prof.id} className="cursor-pointer hover:border-[var(--color-primary)]" onClick={() => selectProfessional(prof)}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold">
                  {prof.user.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{prof.user.full_name}</h3>
                  <p className="text-sm text-gray-500">{prof.specialty || 'General'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === 'datetime' && (
        <div className="space-y-4">
          <button onClick={() => setStep('professional')} className="text-sm text-[var(--color-primary)]">&larr; Cambiar profesional</button>
          <p className="text-gray-500">Elige fecha y hora</p>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((date) => {
              const d = new Date(date)
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  onClick={() => selectDate(date)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-center border transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-gray-200 hover:border-[var(--color-primary)]'
                  }`}
                >
                  <p className="text-xs">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                  <p className="font-bold">{d.getDate()}</p>
                </button>
              )
            })}
          </div>

          {selectedDate && (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => { setSelectedTime(slot.time); setStep('confirm') }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    !slot.available
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : slot.time === selectedTime
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-gray-200 hover:border-[var(--color-primary)] text-gray-700'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <button onClick={() => setStep('datetime')} className="text-sm text-[var(--color-primary)]">&larr; Cambiar hora</button>
          <Card>
            <CardContent className="py-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Resumen de tu cita</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Servicio</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Profesional</span>
                  <span className="font-medium">{selectedProfessional?.user.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium">{new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hora</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duracion</span>
                  <span className="font-medium">{selectedService?.duration_minutes} min</span>
                </div>
                <hr />
                <div className="flex justify-between text-base">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-[var(--color-primary)]">{selectedService?.price}&euro;</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button className="w-full" size="lg" onClick={handleBook} loading={saving}>
            Confirmar Cita
          </Button>
        </div>
      )}
    </div>
  )
}
