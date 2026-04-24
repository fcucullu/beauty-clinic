import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: dbUser } = await supabase
    .from('bloom_users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (dbUser?.role === 'client') {
    redirect('/book')
  }

  redirect('/dashboard')
}
