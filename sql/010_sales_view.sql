-- Vista simplificada de ventas basada en orders
-- Permite consultas homogéneas para KPIs (amount, date, client_id)

create or replace view public.sales as
select
  o.id,
  o.cliente_id as client_id,
  o.fecha as date,
  o.total as amount
from public.orders o;

-- Nota: índices se reutilizan desde la tabla base (orders)
-- Si necesitas filtrar por "usuario" más adelante, añade user_id en orders o en una vista separada.
