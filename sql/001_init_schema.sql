-- Extensiones útiles
create extension if not exists pgcrypto;

-- Usuarios de la app (pueden mapearse a auth.users si se desea)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  telegram_id text unique,
  nombre text,
  email text,
  rol text check (rol in ('admin','vendedor')) default 'vendedor',
  ultima_conexion timestamptz default now(),
  created_at timestamptz default now()
);

-- Clientes
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text,
  direccion text,
  usuario_responsable_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Pedidos
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clients(id) on delete cascade,
  fecha date default current_date,
  estado text default 'pendiente' check (estado in ('pendiente','en_proceso','completado','cancelado')),
  total numeric(12,2) not null default 0,
  usuario_creador_id uuid references public.users(id) on delete set null,
  notas text,
  created_at timestamptz default now()
);

-- Índices adicionales
create index if not exists idx_clients_nombre on public.clients (nombre);
create index if not exists idx_orders_cliente_id on public.orders (cliente_id);
create index if not exists idx_users_telegram_id on public.users (telegram_id);

-- RLS
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;

-- Políticas mínimas de ejemplo para usuarios autenticados (ajustar en fases siguientes)
-- Nota: el bot empleará la clave de servicio y bypassará RLS.
-- SELECT abierto para autenticados (ajustar a equipo/propiedad en siguientes fases)
drop policy if exists users_select_authenticated on public.users;
create policy users_select_authenticated on public.users
  for select to authenticated using (true);
drop policy if exists clients_select_authenticated on public.clients;
create policy clients_select_authenticated on public.clients
  for select to authenticated using (true);
drop policy if exists orders_select_authenticated on public.orders;
create policy orders_select_authenticated on public.orders
  for select to authenticated using (true);

-- INSERT restringido: por ahora permitir a autenticados (ajustar luego)
drop policy if exists users_insert_authenticated on public.users;
create policy users_insert_authenticated on public.users
  for insert to authenticated with check (true);
drop policy if exists clients_insert_authenticated on public.clients;
create policy clients_insert_authenticated on public.clients
  for insert to authenticated with check (true);
drop policy if exists orders_insert_authenticated on public.orders;
create policy orders_insert_authenticated on public.orders
  for insert to authenticated with check (true);

-- UPDATE/DELETE restringidos (opcional para autenticados)
drop policy if exists clients_update_authenticated on public.clients;
create policy clients_update_authenticated on public.clients
  for update to authenticated using (true) with check (true);
drop policy if exists orders_update_authenticated on public.orders;
create policy orders_update_authenticated on public.orders
  for update to authenticated using (true) with check (true);
