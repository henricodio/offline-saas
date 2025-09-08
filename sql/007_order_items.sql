-- Líneas de pedido
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,

  -- Snapshot básico para trazabilidad aunque cambie el producto
  nombre_producto text,
  precio_unitario numeric(12,2) not null,
  cantidad integer not null check (cantidad > 0),
  total_linea numeric(12,2) generated always as (cantidad * precio_unitario) stored,
  notas text,

  created_at timestamptz default now()
);

-- Una línea por producto por pedido (facilita upsert y edición de cantidad)
create unique index if not exists uq_order_items_order_product on public.order_items(order_id, product_id);

-- Índices para consultas
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

-- RLS
alter table public.order_items enable row level security;

drop policy if exists order_items_select_authenticated on public.order_items;
create policy order_items_select_authenticated on public.order_items
  for select to authenticated using (true);

drop policy if exists order_items_insert_authenticated on public.order_items;
create policy order_items_insert_authenticated on public.order_items
  for insert to authenticated with check (true);

drop policy if exists order_items_update_authenticated on public.order_items;
create policy order_items_update_authenticated on public.order_items
  for update to authenticated using (true) with check (true);

-- Trigger para mantener orders.total sincronizado
create or replace function public.trg_recalc_order_total()
returns trigger
language plpgsql as $$
begin
  if (TG_OP = 'DELETE') then
    update public.orders o
    set total = coalesce((select sum(oi.total_linea) from public.order_items oi where oi.order_id = OLD.order_id), 0)
    where o.id = OLD.order_id;
    return OLD;
  else
    update public.orders o
    set total = coalesce((select sum(oi.total_linea) from public.order_items oi where oi.order_id = NEW.order_id), 0)
    where o.id = NEW.order_id;
    return NEW;
  end if;
end;
$$;

-- Un único trigger para insert/update/delete
create trigger order_items_recalc_total_trg
after insert or update or delete on public.order_items
for each row execute function public.trg_recalc_order_total();
