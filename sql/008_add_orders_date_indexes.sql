-- Índices recomendados para listados y cálculo de número corto
create index if not exists idx_orders_fecha_created_at on public.orders (fecha, created_at);
create index if not exists idx_orders_cliente_created_at on public.orders (cliente_id, created_at);
