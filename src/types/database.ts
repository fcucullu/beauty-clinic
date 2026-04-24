export type UserRole = 'superadmin' | 'owner' | 'admin' | 'professional' | 'client'

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  welcome_message: string | null
  business_hours: BusinessHours
  timezone: string
  whatsapp_number: string | null
  custom_domain: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  [day: string]: { open: string; close: string } | null
}

export interface User {
  id: string
  tenant_id: string
  auth_id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Professional {
  id: string
  tenant_id: string
  user_id: string
  specialty: string | null
  bio: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  tenant_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  currency: string
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  tenant_id: string
  client_id: string
  professional_id: string
  service_id: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  notes: string | null
  plan_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentWithDetails extends Appointment {
  client: User
  professional: Professional & { user: User }
  service: Service
}
