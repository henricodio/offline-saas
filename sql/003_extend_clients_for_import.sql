-- Extiende public.clients para admitir importación directa desde CSV
alter table public.clients add column if not exists source text default 'AppDio';
alter table public.clients add column if not exists external_id text; -- id de fuente
alter table public.clients add column if not exists phone text; -- teléfono principal (además de 'contacto')
alter table public.clients add column if not exists id_fiscal text;
alter table public.clients add column if not exists category text;
alter table public.clients add column if not exists route text;
alter table public.clients add column if not exists start_date date;
alter table public.clients add column if not exists status text;
alter table public.clients add column if not exists last_purchase_date date;
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists contact_person text;
alter table public.clients add column if not exists discount_percentage numeric(5,2);
alter table public.clients add column if not exists observations text;
alter table public.clients add column if not exists assigned_to text;

-- Índice único por origen + id externo (permite múltiples NULL en external_id)
create unique index if not exists uq_clients_source_external on public.clients (source, external_id);
