-- Tabla de tareas mínima para KPIs de productividad
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  status text not null check (status in ('pending','completed','canceled')),
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

-- RLS básico
alter table public.tasks enable row level security;

drop policy if exists tasks_select_authenticated on public.tasks;
create policy tasks_select_authenticated on public.tasks
  for select to authenticated using (true);

drop policy if exists tasks_insert_authenticated on public.tasks;
create policy tasks_insert_authenticated on public.tasks
  for insert to authenticated with check (true);

drop policy if exists tasks_update_authenticated on public.tasks;
create policy tasks_update_authenticated on public.tasks
  for update to authenticated using (true) with check (true);
