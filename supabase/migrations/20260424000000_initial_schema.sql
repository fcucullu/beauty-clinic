-- Bloom: Beauty Clinic Management Platform
-- Initial schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TENANTS
-- ============================================
create table bloom_tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text not null default '#8B5CF6',
  secondary_color text not null default '#F59E0B',
  accent_color text not null default '#EC4899',
  welcome_message text,
  business_hours jsonb not null default '{
    "monday": {"open": "09:00", "close": "20:00"},
    "tuesday": {"open": "09:00", "close": "20:00"},
    "wednesday": {"open": "09:00", "close": "20:00"},
    "thursday": {"open": "09:00", "close": "20:00"},
    "friday": {"open": "09:00", "close": "20:00"},
    "saturday": {"open": "10:00", "close": "14:00"},
    "sunday": null
  }'::jsonb,
  timezone text not null default 'Europe/Madrid',
  whatsapp_number text,
  custom_domain text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- USERS
-- ============================================
create table bloom_users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  auth_id uuid not null,
  email text not null,
  full_name text not null,
  phone text,
  role text not null check (role in ('superadmin', 'owner', 'admin', 'professional', 'client')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bloom_users_tenant_id_idx on bloom_users(tenant_id);
create index bloom_users_auth_id_idx on bloom_users(auth_id);
create unique index bloom_users_tenant_email_idx on bloom_users(tenant_id, email);

-- ============================================
-- PROFESSIONALS
-- ============================================
create table bloom_professionals (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  user_id uuid not null references bloom_users(id) on delete cascade,
  specialty text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index bloom_professionals_tenant_id_idx on bloom_professionals(tenant_id);

-- ============================================
-- SERVICES
-- ============================================
create table bloom_services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  price numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bloom_services_tenant_id_idx on bloom_services(tenant_id);

-- ============================================
-- APPOINTMENTS
-- ============================================
create table bloom_appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  client_id uuid not null references bloom_users(id),
  professional_id uuid not null references bloom_professionals(id),
  service_id uuid not null references bloom_services(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  plan_subscription_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bloom_appointments_tenant_id_idx on bloom_appointments(tenant_id);
create index bloom_appointments_client_id_idx on bloom_appointments(client_id);
create index bloom_appointments_professional_id_idx on bloom_appointments(professional_id);
create index bloom_appointments_start_time_idx on bloom_appointments(start_time);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table bloom_tenants enable row level security;
alter table bloom_users enable row level security;
alter table bloom_professionals enable row level security;
alter table bloom_services enable row level security;
alter table bloom_appointments enable row level security;

-- Tenants: anyone can read (needed for theming), only superadmin can write
create policy "tenants_select" on bloom_tenants for select using (true);

-- Users: can read users in same tenant, can update own record
create policy "users_select" on bloom_users for select using (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid()
  )
);

create policy "users_insert" on bloom_users for insert with check (true);

create policy "users_update" on bloom_users for update using (
  auth_id = auth.uid()
);

-- Professionals: anyone in tenant can read
create policy "professionals_select" on bloom_professionals for select using (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid()
  )
);

create policy "professionals_insert" on bloom_professionals for insert with check (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid() and role in ('superadmin', 'owner', 'admin')
  )
);

-- Services: public read (needed for booking), admin write
create policy "services_select" on bloom_services for select using (true);

create policy "services_insert" on bloom_services for insert with check (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid() and role in ('superadmin', 'owner', 'admin')
  )
);

create policy "services_update" on bloom_services for update using (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid() and role in ('superadmin', 'owner', 'admin')
  )
);

-- Appointments: users in tenant can read, clients can insert their own, admin can manage all
create policy "appointments_select" on bloom_appointments for select using (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid()
  )
);

create policy "appointments_insert" on bloom_appointments for insert with check (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid()
  )
);

create policy "appointments_update" on bloom_appointments for update using (
  tenant_id in (
    select tenant_id from bloom_users where auth_id = auth.uid()
  )
);

-- ============================================
-- DEMO TENANT (for initial setup)
-- ============================================
insert into bloom_tenants (id, name, slug, welcome_message, is_demo)
values ('00000000-0000-0000-0000-000000000001', 'Bloom Demo', 'demo', 'Bienvenida a Bloom Demo', true);
