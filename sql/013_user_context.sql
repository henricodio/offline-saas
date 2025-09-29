-- Tabla de contexto de usuario para métricas de adopción/uso del bot
create table if not exists public.user_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  telegram_id text,
  last_action text,
  metadata jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_user_context_user on public.user_context(user_id);
create index if not exists idx_user_context_updated on public.user_context(updated_at);

alter table public.user_context enable row level security;

drop policy if exists user_context_select_authenticated on public.user_context;
create policy user_context_select_authenticated on public.user_context
  for select to authenticated using (true);

drop policy if exists user_context_insert_authenticated on public.user_context;
create policy user_context_insert_authenticated on public.user_context
  for insert to authenticated with check (true);

drop policy if exists user_context_update_authenticated on public.user_context;
create policy user_context_update_authenticated on public.user_context
  for update to authenticated using (true) with check (true);
