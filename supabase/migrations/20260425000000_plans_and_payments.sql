-- Plans and Payments schema for Bloom

-- Plans (definitions)
create table bloom_plans (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  name text not null,
  description text,
  service_ids uuid[] not null default '{}',
  total_sessions integer not null,
  price numeric(10,2) not null,
  currency text not null default 'EUR',
  validity_days integer not null default 365,
  is_active boolean not null default true,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bloom_plans_tenant_id_idx on bloom_plans(tenant_id);

-- Plan Subscriptions (purchased plans)
create table bloom_plan_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  plan_id uuid not null references bloom_plans(id),
  client_id uuid not null references bloom_users(id),
  sessions_used integer not null default 0,
  sessions_total integer not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'completed')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bloom_plan_subscriptions_tenant_id_idx on bloom_plan_subscriptions(tenant_id);
create index bloom_plan_subscriptions_client_id_idx on bloom_plan_subscriptions(client_id);

-- Plan Usage (session tracking)
create table bloom_plan_usage (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references bloom_plan_subscriptions(id) on delete cascade,
  appointment_id uuid not null references bloom_appointments(id),
  used_at timestamptz not null default now()
);

create index bloom_plan_usage_subscription_id_idx on bloom_plan_usage(subscription_id);

-- Payments
create table bloom_payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references bloom_tenants(id) on delete cascade,
  client_id uuid not null references bloom_users(id),
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  type text not null check (type in ('plan_purchase', 'service_payment', 'refund')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  plan_subscription_id uuid references bloom_plan_subscriptions(id),
  appointment_id uuid references bloom_appointments(id),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  description text,
  created_at timestamptz not null default now()
);

create index bloom_payments_tenant_id_idx on bloom_payments(tenant_id);
create index bloom_payments_client_id_idx on bloom_payments(client_id);

-- RLS
alter table bloom_plans enable row level security;
alter table bloom_plan_subscriptions enable row level security;
alter table bloom_plan_usage enable row level security;
alter table bloom_payments enable row level security;

create policy "plans_select" on bloom_plans for select using (true);
create policy "plans_insert" on bloom_plans for insert with check (
  tenant_id in (select tenant_id from bloom_users where auth_id = auth.uid() and role in ('superadmin', 'owner', 'admin'))
);
create policy "plans_update" on bloom_plans for update using (
  tenant_id in (select tenant_id from bloom_users where auth_id = auth.uid() and role in ('superadmin', 'owner', 'admin'))
);

create policy "plan_subs_select" on bloom_plan_subscriptions for select using (
  tenant_id in (select tenant_id from bloom_users where auth_id = auth.uid())
);
create policy "plan_subs_insert" on bloom_plan_subscriptions for insert with check (true);
create policy "plan_subs_update" on bloom_plan_subscriptions for update using (
  tenant_id in (select tenant_id from bloom_users where auth_id = auth.uid())
);

create policy "plan_usage_select" on bloom_plan_usage for select using (
  subscription_id in (select id from bloom_plan_subscriptions where tenant_id in (select tenant_id from bloom_users where auth_id = auth.uid()))
);
create policy "plan_usage_insert" on bloom_plan_usage for insert with check (true);

create policy "payments_select" on bloom_payments for select using (
  tenant_id in (select tenant_id from bloom_users where auth_id = auth.uid())
);
create policy "payments_insert" on bloom_payments for insert with check (true);

alter table bloom_appointments add constraint bloom_appointments_plan_subscription_id_fkey
  foreign key (plan_subscription_id) references bloom_plan_subscriptions(id);
