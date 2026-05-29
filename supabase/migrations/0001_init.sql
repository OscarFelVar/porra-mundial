-- Porra Mundial 2026 — esquema inicial
-- Tablas + RLS.
-- Aplicar en el SQL editor de Supabase o con `supabase db push`.

-- =========================================================
-- Tipos
-- =========================================================
create type public.match_phase as enum (
  'grupos',
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semifinal',
  'tercer_puesto',
  'final'
);

create type public.match_status as enum ('scheduled', 'live', 'finished');

-- =========================================================
-- Tablas
-- =========================================================

-- Perfil de usuario (1:1 con auth.users)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Selecciones
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,
  name        text not null,
  code        text,             -- código FIFA de 3 letras
  flag_url    text,
  crest_url   text,
  group_label text,             -- A..L en fase de grupos
  created_at  timestamptz not null default now()
);

-- Partidos
create table public.matches (
  id                 uuid primary key default gen_random_uuid(),
  external_id        text unique,   -- id de football-data.org (idempotencia del sync)
  phase              public.match_phase not null,
  group_label        text,
  home_team_id       uuid references public.teams (id),
  away_team_id       uuid references public.teams (id),
  kickoff_at         timestamptz not null,
  status             public.match_status not null default 'scheduled',
  home_score_90      int,
  away_score_90      int,
  advancing_team_id  uuid references public.teams (id),   -- quién avanza (eliminatorias)
  created_at         timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches (kickoff_at);
create index matches_phase_idx on public.matches (phase);

-- Pronósticos. El "cierre" no se guarda: se deriva de matches.kickoff_at.
create table public.predictions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  match_id           uuid not null references public.matches (id) on delete cascade,
  home_score         int not null,
  away_score         int not null,
  advancing_team_id  uuid references public.teams (id),  -- sólo si el pronóstico a 90' es empate (eliminatoria)
  points_awarded     int,                                -- null hasta que el partido finaliza
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, match_id)
);

-- Apuestas especiales (1 por usuario)
create table public.special_bets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade unique,
  champion_team_id  uuid references public.teams (id),
  runnerup_team_id  uuid references public.teams (id),
  top_scorer        text,
  points_awarded    int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Configuración global (singleton). Guarda también el resultado real de las
-- apuestas especiales para puntuarlas al final del torneo.
create table public.app_settings (
  id                       int primary key default 1 check (id = 1),
  special_bets_deadline    timestamptz,
  result_champion_team_id  uuid references public.teams (id),
  result_runnerup_team_id  uuid references public.teams (id),
  result_top_scorer        text
);

insert into public.app_settings (id) values (1);

-- =========================================================
-- Alta de perfil
-- =========================================================

-- Al crear un usuario en auth, crea su perfil (registro abierto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper de admin (SECURITY DEFINER para evitar recursión de RLS sobre profiles).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.special_bets enable row level security;
alter table public.app_settings enable row level security;

-- profiles: todos los autenticados ven perfiles (tabla de posiciones); cada quien edita el suyo.
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- teams: lectura para autenticados; escritura sólo admin.
create policy "teams_select_all" on public.teams
  for select to authenticated using (true);
create policy "teams_admin_write" on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- matches: lectura para autenticados; escritura sólo admin.
create policy "matches_select_all" on public.matches
  for select to authenticated using (true);
create policy "matches_admin_write" on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- predictions:
--   ver: las propias siempre; ajenas sólo cuando el partido ya cerró (kickoff pasó).
--   crear/editar: sólo propias y sólo antes del cierre.
create policy "predictions_select_own_or_locked" on public.predictions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.matches m where m.id = predictions.match_id and now() >= m.kickoff_at)
    or public.is_admin()
  );

create policy "predictions_insert_own_before_lock" on public.predictions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff_at)
  );

create policy "predictions_update_own_before_lock" on public.predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff_at)
  );

-- special_bets:
--   ver: las propias siempre; ajenas sólo tras el deadline.
--   crear/editar: propias y antes del deadline.
create policy "special_bets_select_own_or_after_deadline" on public.special_bets
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.app_settings s where s.special_bets_deadline is not null and now() >= s.special_bets_deadline)
    or public.is_admin()
  );

create policy "special_bets_insert_own_before_deadline" on public.special_bets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.app_settings s where s.special_bets_deadline is null or now() < s.special_bets_deadline)
  );

create policy "special_bets_update_own_before_deadline" on public.special_bets
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.app_settings s where s.special_bets_deadline is null or now() < s.special_bets_deadline)
  );

-- app_settings: lectura para autenticados; escritura sólo admin.
create policy "app_settings_select_all" on public.app_settings
  for select to authenticated using (true);
create policy "app_settings_admin_write" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- NOTA: el motor de puntos (cálculo de points_awarded) llega en una migración
-- posterior; correrá como service_role / SECURITY DEFINER, así que omite RLS.
