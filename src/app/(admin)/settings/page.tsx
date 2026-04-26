'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTenant } from '@/lib/tenant/context'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const tenant = useTenant()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: tenant.name,
    welcome_message: tenant.welcome_message || '',
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
    accent_color: tenant.accent_color,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    let logoUrl = tenant.logo_url

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `tenants/${tenant.id}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('bloom-assets')
        .upload(path, logoFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('bloom-assets')
          .getPublicUrl(path)
        logoUrl = urlData.publicUrl
      }
    }

    await supabase
      .from('bloom_tenants')
      .update({
        name: form.name,
        welcome_message: form.welcome_message || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        logo_url: logoUrl,
      })
      .eq('id', tenant.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Reload to apply new theming
    window.location.reload()
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>

      {/* Branding */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Marca y Personalizacion</h2>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: form.primary_color }}
                >
                  {form.name.charAt(0)}
                </div>
              )}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <p className="text-xs text-gray-400 mt-1">PNG o JPG, max 1MB</p>
              </div>
            </div>
          </div>

          <Input
            label="Nombre de la clinica"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label="Mensaje de bienvenida"
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
            placeholder="Ej: Bienvenida a nuestra clinica"
          />

          {/* Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Colores</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Primario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400 font-mono">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Secundario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                    className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400 font-mono">{form.secondary_color}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Acento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400 font-mono">{form.accent_color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    {form.name.charAt(0)}
                  </div>
                )}
                <span className="font-semibold text-gray-900">{form.name}</span>
              </div>
              <div className="flex gap-2">
                <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: form.primary_color }}>
                  Boton primario
                </div>
                <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: form.secondary_color }}>
                  Secundario
                </div>
                <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: form.accent_color }}>
                  Acento
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>
              Guardar cambios
            </Button>
            {saved && <span className="text-sm text-green-600">Guardado</span>}
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Cuenta</h2>
        </CardHeader>
        <CardContent>
          <Button variant="danger" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
