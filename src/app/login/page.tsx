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
  // magicLinkSent kept for future use when email provider is configured
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contrasena incorrectos')
      setLoading(false)
    } else {
      router.push('/book')
    }
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

              <Input
                label="Contrasena"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contrasena"
                required
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" loading={loading}>
                Iniciar sesion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
