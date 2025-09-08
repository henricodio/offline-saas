-- Índices por categoría para acelerar filtros y listados
-- Products
create index if not exists idx_products_category on public.products (category);
-- Opcional: combinado para ordenar por nombre dentro de categoría
create index if not exists idx_products_category_name on public.products (category, name);

-- Clients (se añadió columna category en 003_extend_clients_for_import.sql)
create index if not exists idx_clients_category on public.clients (category);
