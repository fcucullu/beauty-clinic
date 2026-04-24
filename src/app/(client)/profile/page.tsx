'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { dbUser, loading } = useUser()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <p className="text-gray-400 py-8 text-center">Cargando...</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>

      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold text-xl">
              {dbUser?.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{dbUser?.full_name}</p>
              <p className="text-sm text-gray-500">{dbUser?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Telefono</span>
            <span className="text-gray-900">{dbUser?.phone || 'No registrado'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Miembro desde</span>
            <span className="text-gray-900">
              {dbUser?.created_at ? new Date(dbUser.created_at).toLocaleDateString('es-ES') : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        Cerrar sesion
      </Button>
    </div>
  )
}
