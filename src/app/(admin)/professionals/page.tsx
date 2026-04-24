'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'

interface ProfessionalWithUser {
  id: string
  specialty: string | null
  bio: string | null
  is_active: boolean
  user: { full_name: string; email: string; avatar_url: string | null }
}

export default function ProfessionalsPage() {
  const tenant = useTenant()
  const [professionals, setProfessionals] = useState<ProfessionalWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    specialty: '',
    bio: '',
  })

  useEffect(() => {
    loadProfessionals()
  }, [tenant.id])

  async function loadProfessionals() {
    const supabase = createClient()
    const { data } = await supabase
      .from('bloom_professionals')
      .select('*, user:bloom_users!bloom_professionals_user_id_fkey(full_name, email, avatar_url)')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
    setProfessionals(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    setSaving(true)
    const supabase = createClient()

    // Create the user first
    const { data: newUser } = await supabase
      .from('bloom_users')
      .insert({
        tenant_id: tenant.id,
        auth_id: crypto.randomUUID(), // placeholder until they sign up
        email: form.email,
        full_name: form.full_name,
        role: 'professional',
      })
      .select()
      .single()

    if (newUser) {
      await supabase
        .from('bloom_professionals')
        .insert({
          tenant_id: tenant.id,
          user_id: newUser.id,
          specialty: form.specialty || null,
          bio: form.bio || null,
          is_active: true,
        })
    }

    setModalOpen(false)
    setSaving(false)
    setForm({ full_name: '', email: '', specialty: '', bio: '' })
    loadProfessionals()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profesionales</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo Profesional</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : professionals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No hay profesionales. Agrega tu primer profesional.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals.map((prof) => (
            <Card key={prof.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold">
                    {prof.user.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{prof.user.full_name}</h3>
                    <p className="text-sm text-gray-500">{prof.specialty || 'General'}</p>
                  </div>
                </div>
                {prof.bio && (
                  <p className="text-sm text-gray-500 mt-3">{prof.bio}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Profesional">
        <div className="space-y-4">
          <Input label="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Especialidad" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ej: Dermatologia, Estetica..." />
          <Input label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Breve descripcion..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.full_name || !form.email}>
              Crear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
