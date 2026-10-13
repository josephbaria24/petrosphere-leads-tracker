-- Shared funnel labels, targets, and logged achievements for the performance dashboard.
-- Uses only objects that exist in this database (no is_crm_admin helper).
-- Signed-in users can read and update the board. Anonymous users cannot.

create table if not exists public.performance_board (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.performance_board enable row level security;

drop policy if exists "performance_board_admin_all" on public.performance_board;
drop policy if exists "performance_board_authenticated_all" on public.performance_board;

create policy "performance_board_authenticated_all"
  on public.performance_board
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.performance_board to authenticated;
