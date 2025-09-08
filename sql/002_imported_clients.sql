-- Tabla para importar clientes desde fuentes externas (CSV)
create table if not exists public.imported_clients (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'AppDio',
  external_id text, -- id de la fuente (puede ser numérico en texto)
  client_name text not null,
  address text,
  phone text,
  assigned_to text,
  id_fiscal text,
  category text,
  route text,
  start_date date,
  status text,
  last_purchase_date date,
  city text,
  contact_person text,
  discount_percentage numeric(5,2),
  observations text,
  -- vínculo opcional al cliente normalizado en public.clients
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz default now()
);

-- Evitar duplicados por fuente + id externo
create unique index if not exists uq_imported_clients_source_external
  on public.imported_clients (source, external_id);

-- Índices de ayuda
create index if not exists idx_imported_clients_client_name on public.imported_clients (client_name);
create index if not exists idx_imported_clients_city on public.imported_clients (city);

-- Habilitar RLS y políticas mínimas similares al resto
alter table public.imported_clients enable row level security;

drop policy if exists imported_clients_select_authenticated on public.imported_clients;
create policy imported_clients_select_authenticated on public.imported_clients
  for select to authenticated using (true);

drop policy if exists imported_clients_insert_authenticated on public.imported_clients;
create policy imported_clients_insert_authenticated on public.imported_clients
  for insert to authenticated with check (true);

drop policy if exists imported_clients_update_authenticated on public.imported_clients;
create policy imported_clients_update_authenticated on public.imported_clients
  for update to authenticated using (true) with check (true);
