'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Mode = 'admin' | 'client'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('client')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contrasena incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleClientLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/my-appointments` },
    })
    if (error) {
      setError('Error al enviar el enlace. Intenta de nuevo.')
      setLoading(false)
    } else {
      setMagicLinkSent(true)
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Revisa tu email</h2>
            <p className="text-sm text-gray-500">
              Te enviamos un enlace a <strong>{email}</strong> para iniciar sesion.
            </p>
            <button onClick={() => setMagicLinkSent(false)} className="text-sm text-[var(--color-primary)]">
              Volver
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-[var(--color-primary,#8B5CF6)] mx-auto flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Bloom</h1>
          <p className="text-gray-500 text-sm mt-1">Inicia sesion para continuar</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('client')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${mode === 'client' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
          >
            Soy cliente
          </button>
          <button
            onClick={() => setMode('admin')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${mode === 'admin' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
          >
            Soy profesional
          </button>
        </div>

        <Card>
          <CardContent className="py-5">
            <form onSubmit={mode === 'admin' ? handleAdminLogin : handleClientLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />

              {mode === 'admin' && (
                <Input
                  label="Contrasena"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contrasena"
                  required
                />
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" loading={loading}>
                {mode === 'admin' ? 'Iniciar sesion' : 'Enviar enlace magico'}
              </Button>

              {mode === 'client' && (
                <p className="text-xs text-center text-gray-400">
                  Te enviaremos un enlace a tu email para acceder sin contrasena
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
