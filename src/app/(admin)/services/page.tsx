'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/types/database'

export default function ServicesPage() {
  const tenant = useTenant()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: 0,
    category: '',
  })

  useEffect(() => {
    loadServices()
  }, [tenant.id])

  async function loadServices() {
    const supabase = createClient()
    const { data } = await supabase
      .from('bloom_services')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name')
    setServices(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditingService(null)
    setForm({ name: '', description: '', duration_minutes: 60, price: 0, category: '' })
    setModalOpen(true)
  }

  function openEdit(service: Service) {
    setEditingService(service)
    setForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    if (editingService) {
      await supabase
        .from('bloom_services')
        .update({
          name: form.name,
          description: form.description || null,
          duration_minutes: form.duration_minutes,
          price: form.price,
          category: form.category || null,
        })
        .eq('id', editingService.id)
    } else {
      await supabase
        .from('bloom_services')
        .insert({
          tenant_id: tenant.id,
          name: form.name,
          description: form.description || null,
          duration_minutes: form.duration_minutes,
          price: form.price,
          currency: 'EUR',
          category: form.category || null,
          is_active: true,
        })
    }

    setModalOpen(false)
    setSaving(false)
    loadServices()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase
      .from('bloom_services')
      .update({ is_active: false })
      .eq('id', id)
    loadServices()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
        <Button onClick={openCreate}>Nuevo Servicio</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No hay servicios. Crea tu primer servicio.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {service.category}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[var(--color-primary)]">{service.price}&euro;</p>
                </div>
                {service.description && (
                  <p className="text-sm text-gray-500 mt-2">{service.description}</p>
                )}
                <p className="text-sm text-gray-400 mt-2">{service.duration_minutes} min</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(service)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)}>Eliminar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}>
        <div className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Limpieza facial" />
          <Input label="Descripcion" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion del servicio" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duracion (min)" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
            <Input label="Precio (EUR)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          </div>
          <Input label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej: Facial, Corporal..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name}>
              {editingService ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
