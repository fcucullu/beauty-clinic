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
  referral_code: string | null
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

export type PlanSubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'completed'
export type PaymentType = 'plan_purchase' | 'service_payment' | 'refund'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Plan {
  id: string
  tenant_id: string
  name: string
  description: string | null
  service_ids: string[]
  total_sessions: number
  price: number
  currency: string
  validity_days: number
  is_active: boolean
  stripe_price_id: string | null
  created_at: string
  updated_at: string
}

export interface PlanSubscription {
  id: string
  tenant_id: string
  plan_id: string
  client_id: string
  sessions_used: number
  sessions_total: number
  status: PlanSubscriptionStatus
  starts_at: string
  expires_at: string
  stripe_payment_intent_id: string | null
  created_at: string
  updated_at: string
}

export interface PlanSubscriptionWithDetails extends PlanSubscription {
  plan: Plan
  client: User
}

export interface Payment {
  id: string
  tenant_id: string
  client_id: string
  amount: number
  currency: string
  type: PaymentType
  status: PaymentStatus
  plan_subscription_id: string | null
  appointment_id: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  description: string | null
  created_at: string
}

export interface PaymentWithDetails extends Payment {
  client: User
}
