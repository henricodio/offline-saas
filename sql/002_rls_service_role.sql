-- Permitir a service_role bypassear RLS completamente
-- El bot de Telegram usa la clave de servicio y necesita acceso total

-- Políticas para clients
drop policy if exists clients_select_service_role on public.clients;
create policy clients_select_service_role on public.clients
  for select to service_role using (true);

drop policy if exists clients_insert_service_role on public.clients;
create policy clients_insert_service_role on public.clients
  for insert to service_role with check (true);

drop policy if exists clients_update_service_role on public.clients;
create policy clients_update_service_role on public.clients
  for update to service_role using (true) with check (true);

drop policy if exists clients_delete_service_role on public.clients;
create policy clients_delete_service_role on public.clients
  for delete to service_role using (true);

-- Políticas para orders
drop policy if exists orders_select_service_role on public.orders;
create policy orders_select_service_role on public.orders
  for select to service_role using (true);

drop policy if exists orders_insert_service_role on public.orders;
create policy orders_insert_service_role on public.orders
  for insert to service_role with check (true);

drop policy if exists orders_update_service_role on public.orders;
create policy orders_update_service_role on public.orders
  for update to service_role using (true) with check (true);

drop policy if exists orders_delete_service_role on public.orders;
create policy orders_delete_service_role on public.orders
  for delete to service_role using (true);

-- Políticas para users
drop policy if exists users_select_service_role on public.users;
create policy users_select_service_role on public.users
  for select to service_role using (true);

drop policy if exists users_insert_service_role on public.users;
create policy users_insert_service_role on public.users
  for insert to service_role with check (true);

drop policy if exists users_update_service_role on public.users;
create policy users_update_service_role on public.users
  for update to service_role using (true) with check (true);

drop policy if exists users_delete_service_role on public.users;
create policy users_delete_service_role on public.users
  for delete to service_role using (true);
