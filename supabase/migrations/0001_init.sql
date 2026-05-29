-- Porra Mundial 2026 — esquema inicial (multicliente)
-- Tablas + RLS. Grupos de porra (pools) con pronósticos default + override por grupo.
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

create type public.pool_role as enum ('owner', 'member');

-- =========================================================
-- Tablas
-- =========================================================

-- Perfil de usuario (1:1 con auth.users)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  display_name text,
  is_admin     boolean not null default false,   -- admin global (carga resultados del torneo)
  created_at   timestamptz not null default now()
);

-- Selecciones (datos globales del torneo)
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

-- Partidos (datos globales del torneo)
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

-- Grupos de porra (multicliente). Cada uno con su código de invitación y tope opcional.
create table public.pools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  max_members int,              -- null = sin tope
  created_at  timestamptz not null default now()
);

-- Membresías de grupo
create table public.pool_members (
  pool_id   uuid not null references public.pools (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      public.pool_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create index pool_members_user_idx on public.pool_members (user_id);

-- Pronósticos. pool_id null = set "por defecto" del usuario; pool_id no null = override de ese grupo.
-- El "cierre" no se guarda: se deriva de matches.kickoff_at.
create table public.predictions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  match_id           uuid not null references public.matches (id) on delete cascade,
  pool_id            uuid references public.pools (id) on delete cascade,
  home_score         int not null,
  away_score         int not null,
  advancing_team_id  uuid references public.teams (id),  -- sólo si el pronóstico a 90' es empate (eliminatoria)
  points_awarded     int,                                -- null hasta que el partido finaliza
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index predictions_match_idx on public.predictions (match_id);
-- Un default por (usuario, partido); un override por (usuario, partido, grupo).
create unique index predictions_default_uidx on public.predictions (user_id, match_id) where pool_id is null;
create unique index predictions_pool_uidx on public.predictions (user_id, match_id, pool_id) where pool_id is not null;

-- Apuestas especiales. Mismo patrón default + override por grupo.
create table public.special_bets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  pool_id           uuid references public.pools (id) on delete cascade,
  champion_team_id  uuid references public.teams (id),
  runnerup_team_id  uuid references public.teams (id),
  top_scorer        text,
  points_awarded    int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index special_bets_default_uidx on public.special_bets (user_id) where pool_id is null;
create unique index special_bets_pool_uidx on public.special_bets (user_id, pool_id) where pool_id is not null;

-- Configuración global del torneo (singleton): deadline de apuestas especiales y resultado real.
create table public.app_settings (
  id                       int primary key default 1 check (id = 1),
  special_bets_deadline    timestamptz,
  result_champion_team_id  uuid references public.teams (id),
  result_runnerup_team_id  uuid references public.teams (id),
  result_top_scorer        text
);

insert into public.app_settings (id) values (1);

-- =========================================================
-- Alta de perfil (registro abierto)
-- =========================================================
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

-- =========================================================
-- Helpers (SECURITY DEFINER para evitar recursión de RLS)
-- =========================================================
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_pool_member(p_pool uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.pool_members where pool_id = p_pool and user_id = auth.uid());
$$;

-- ¿auth.uid() comparte algún grupo con p_other?
create or replace function public.shares_pool(p_other uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from public.pool_members m1
    join public.pool_members m2 on m1.pool_id = m2.pool_id
    where m1.user_id = auth.uid() and m2.user_id = p_other
  );
$$;

-- =========================================================
-- Crear / unirse a un grupo (SECURITY DEFINER: saltan RLS de forma controlada)
-- =========================================================
create or replace function public.create_pool(p_name text)
returns public.pools
language plpgsql security definer set search_path = public as $$
declare
  v_pool public.pools;
begin
  insert into public.pools (name, invite_code, owner_id)
  values (p_name, upper(substr(md5(gen_random_uuid()::text), 1, 8)), auth.uid())
  returning * into v_pool;

  insert into public.pool_members (pool_id, user_id, role)
  values (v_pool.id, auth.uid(), 'owner');

  return v_pool;
end;
$$;

create or replace function public.join_pool(p_code text)
returns public.pools
language plpgsql security definer set search_path = public as $$
declare
  v_pool  public.pools;
  v_count int;
begin
  select * into v_pool from public.pools where invite_code = upper(p_code);
  if v_pool.id is null then
    raise exception 'Código de invitación inválido';
  end if;

  if exists (select 1 from public.pool_members where pool_id = v_pool.id and user_id = auth.uid()) then
    return v_pool;  -- ya es miembro
  end if;

  if v_pool.max_members is not null then
    select count(*) into v_count from public.pool_members where pool_id = v_pool.id;
    if v_count >= v_pool.max_members then
      raise exception 'Este grupo está lleno';
    end if;
  end if;

  insert into public.pool_members (pool_id, user_id, role)
  values (v_pool.id, auth.uid(), 'member');

  return v_pool;
end;
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.predictions enable row level security;
alter table public.special_bets enable row level security;
alter table public.app_settings enable row level security;

-- profiles: ves tu perfil y el de quienes comparten grupo contigo (para las tablas).
create policy "profiles_select_shared" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_pool(id) or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- teams / matches / app_settings: lectura para autenticados; escritura sólo admin global.
create policy "teams_select_all" on public.teams
  for select to authenticated using (true);
create policy "teams_admin_write" on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "matches_select_all" on public.matches
  for select to authenticated using (true);
create policy "matches_admin_write" on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "app_settings_select_all" on public.app_settings
  for select to authenticated using (true);
create policy "app_settings_admin_write" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- pools: ves los grupos a los que perteneces. Crear es vía create_pool(); editar/borrar, el dueño.
create policy "pools_select_member" on public.pools
  for select to authenticated
  using (public.is_pool_member(id) or owner_id = auth.uid() or public.is_admin());
create policy "pools_update_owner" on public.pools
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "pools_delete_owner" on public.pools
  for delete to authenticated using (owner_id = auth.uid());

-- pool_members: ves a los miembros de tus grupos. Unirse es vía join_pool(); puedes salir tú mismo.
create policy "pool_members_select_member" on public.pool_members
  for select to authenticated
  using (public.is_pool_member(pool_id) or public.is_admin());
create policy "pool_members_delete_self" on public.pool_members
  for delete to authenticated using (user_id = auth.uid());

-- predictions:
--   ver: las propias siempre; ajenas sólo tras el cierre del partido y dentro de un grupo compartido.
--   crear/editar: sólo propias, antes del cierre, y el override sólo en grupos donde eres miembro.
create policy "predictions_select" on public.predictions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      exists (select 1 from public.matches m where m.id = predictions.match_id and now() >= m.kickoff_at)
      and (
        (pool_id is null and public.shares_pool(user_id))
        or (pool_id is not null and public.is_pool_member(pool_id))
      )
    )
  );

create policy "predictions_insert_own" on public.predictions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff_at)
  );

create policy "predictions_update_own" on public.predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff_at)
  );

-- special_bets: mismo criterio, con el deadline global en vez del kickoff.
create policy "special_bets_select" on public.special_bets
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      exists (select 1 from public.app_settings s where s.special_bets_deadline is not null and now() >= s.special_bets_deadline)
      and (
        (pool_id is null and public.shares_pool(user_id))
        or (pool_id is not null and public.is_pool_member(pool_id))
      )
    )
  );

create policy "special_bets_insert_own" on public.special_bets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and exists (select 1 from public.app_settings s where s.special_bets_deadline is null or now() < s.special_bets_deadline)
  );

create policy "special_bets_update_own" on public.special_bets
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and exists (select 1 from public.app_settings s where s.special_bets_deadline is null or now() < s.special_bets_deadline)
  );

-- NOTA: el motor de puntos (points_awarded) y la vista de tabla por grupo llegan en una
-- migración posterior; correrán como service_role / SECURITY DEFINER, así que omiten RLS.
-- La tabla de un grupo usa, por cada miembro y partido, el override del grupo si existe,
-- y si no, el pronóstico por defecto del usuario.
