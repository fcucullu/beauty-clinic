import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { count } = await supabase
    .from('bloom_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'client')

  return NextResponse.json({
    app: 'bloom',
    users: count || 0,
  })
}
