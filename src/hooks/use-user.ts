'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as DbUser, UserRole } from '@/types/database'
import type { User } from '@supabase/supabase-js'

interface UserState {
  authUser: User | null
  dbUser: DbUser | null
  role: UserRole | null
  loading: boolean
}

export function useUser() {
  const [state, setState] = useState<UserState>({
    authUser: null,
    dbUser: null,
    role: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState({ authUser: null, dbUser: null, role: null, loading: false })
        return
      }

      const { data: dbUser } = await supabase
        .from('bloom_users')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      setState({
        authUser: user,
        dbUser,
        role: dbUser?.role || null,
        loading: false,
      })
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
