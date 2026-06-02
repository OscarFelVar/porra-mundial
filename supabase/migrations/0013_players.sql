-- Porra Mundial 2026 — jugadores (para autocompletar las apuestas especiales)
-- Se cargan desde football-data (las plantillas vienen en /competitions/WC/teams).
-- Aplicar en el SQL editor de Supabase, y luego lanzar un POST a /api/sync.

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,                                   -- id de football-data (idempotencia)
  team_id     uuid references public.teams (id) on delete cascade,
  name        text not null,
  position    text,                                          -- 'Goalkeeper', 'Defence', etc.
  created_at  timestamptz not null default now()
);

create index if not exists players_team_idx     on public.players (team_id);
create index if not exists players_position_idx on public.players (position);

alter table public.players enable row level security;

create policy "players_select_all" on public.players
  for select to authenticated using (true);

create policy "players_admin_write" on public.players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
