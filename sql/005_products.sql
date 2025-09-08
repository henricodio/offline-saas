-- Tabla de productos para importar desde CSV
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  -- Identificación de fuente para upsert/evitar duplicados
  source text not null default 'AppDio',
  external_id text,

  -- Campos del CSV
  name text not null,
  description text,
  price numeric(12,2),
  stock integer,
  category text,
  supplier_id text,
  image_url text,

  -- Timestamps
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Evitar duplicados por (source, external_id)
create unique index if not exists uq_products_source_external on public.products (source, external_id);
-- Búsquedas frecuentes
create index if not exists idx_products_name on public.products (name);
create index if not exists idx_products_category on public.products (category);

-- Habilitar RLS y políticas mínimas (igual que otras tablas)
alter table public.products enable row level security;

drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated on public.products
  for select to authenticated using (true);

drop policy if exists products_insert_authenticated on public.products;
create policy products_insert_authenticated on public.products
  for insert to authenticated with check (true);

drop policy if exists products_update_authenticated on public.products;
create policy products_update_authenticated on public.products
  for update to authenticated using (true) with check (true);
