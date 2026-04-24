import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/types/database'

const DEFAULT_TENANT: Tenant = {
  id: 'demo',
  name: 'Bloom Demo',
  slug: 'demo',
  logo_url: null,
  primary_color: '#8B5CF6',
  secondary_color: '#F59E0B',
  accent_color: '#EC4899',
  welcome_message: 'Bienvenida a Bloom',
  business_hours: {
    monday: { open: '09:00', close: '20:00' },
    tuesday: { open: '09:00', close: '20:00' },
    wednesday: { open: '09:00', close: '20:00' },
    thursday: { open: '09:00', close: '20:00' },
    friday: { open: '09:00', close: '20:00' },
    saturday: { open: '10:00', close: '14:00' },
    sunday: null,
  },
  timezone: 'Europe/Madrid',
  whatsapp_number: null,
  custom_domain: null,
  is_demo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export async function getTenant(slug?: string): Promise<Tenant> {
  if (!slug) return DEFAULT_TENANT

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('bloom_tenants')
      .select('*')
      .eq('slug', slug)
      .single()

    return data || DEFAULT_TENANT
  } catch {
    return DEFAULT_TENANT
  }
}
