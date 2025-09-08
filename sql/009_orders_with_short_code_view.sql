-- Vista para exponer "número corto" de pedido sin calcular en el cliente
create or replace view public.orders_with_short_code as
select
  o.id,
  o.cliente_id,
  o.total,
  o.fecha,
  o.created_at,
  (to_char(o.fecha, 'FMDD') || '/' || to_char(o.fecha, 'FMMM') || '.' || to_char(o.fecha, 'YYYY') || '-' || rn::text) as short_code
from (
  select o.*, row_number() over (partition by o.fecha order by o.created_at) as rn
  from public.orders o
) o;
