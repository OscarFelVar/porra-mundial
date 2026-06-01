-- Porra Mundial 2026 — cuadro completo de eliminatorias (predicción de avance)
-- El usuario rellena TODO el cuadro de una vez cuando se conocen los dieciseisavos.
-- Puntuación por aciertos de clasificado, escalada por ronda.
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. Predicciones de cuadro (una fila por ronda+llave)
--    pool_id null = set por defecto; no null = override por grupo.
-- =========================================================
create table if not exists public.bracket_predictions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  pool_id           uuid references public.pools (id) on delete cascade,
  round             public.match_phase not null,
  slot              int not null,
  predicted_team_id uuid not null references public.teams (id),
  points_awarded    int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists bracket_default_uidx
  on public.bracket_predictions (user_id, round, slot) where pool_id is null;
create unique index if not exists bracket_pool_uidx
  on public.bracket_predictions (user_id, round, slot, pool_id) where pool_id is not null;
create index if not exists bracket_user_idx on public.bracket_predictions (user_id);

-- =========================================================
-- 2. Apertura/cierre del cuadro: se deriva del primer dieciseisavos.
--    Abierto = ya se conocen los cruces y aún no ha empezado.
-- =========================================================
create or replace function public.bracket_first_kickoff()
returns timestamptz language sql security definer set search_path = public stable as $$
  select min(kickoff_at) from public.matches where phase = 'dieciseisavos';
$$;

create or replace function public.bracket_is_open()
returns boolean language sql security definer set search_path = public stable as $$
  select public.bracket_first_kickoff() is not null
     and now() < public.bracket_first_kickoff();
$$;

create or replace function public.bracket_is_locked()
returns boolean language sql security definer set search_path = public stable as $$
  select public.bracket_first_kickoff() is not null
     and now() >= public.bracket_first_kickoff();
$$;

-- =========================================================
-- 3. Guardar una elección del cuadro (con candado de cierre)
-- =========================================================
create or replace function public.upsert_bracket_pick(
  p_round   public.match_phase,
  p_slot    int,
  p_team_id uuid,
  p_pool_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.bracket_is_open() then
    raise exception 'El cuadro de eliminatorias está cerrado o aún no disponible';
  end if;
  if p_pool_id is not null and not public.is_pool_member(p_pool_id) then
    raise exception 'No eres miembro de ese grupo';
  end if;

  if p_pool_id is null then
    insert into public.bracket_predictions (user_id, pool_id, round, slot, predicted_team_id)
    values (auth.uid(), null, p_round, p_slot, p_team_id)
    on conflict (user_id, round, slot) where pool_id is null
      do update set predicted_team_id = excluded.predicted_team_id, updated_at = now();
  else
    insert into public.bracket_predictions (user_id, pool_id, round, slot, predicted_team_id)
    values (auth.uid(), p_pool_id, p_round, p_slot, p_team_id)
    on conflict (user_id, round, slot, pool_id) where pool_id is not null
      do update set predicted_team_id = excluded.predicted_team_id, updated_at = now();
  end if;
end;
$$;

-- =========================================================
-- 4. Puntos del cuadro: por cada elección, si ese equipo avanzó
--    de verdad en esa ronda, suma los puntos de la ronda.
-- =========================================================
create or replace function public.calculate_bracket_points()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.bracket_predictions bp
  set points_awarded = case
    when exists (
      select 1 from public.matches mt
      where mt.phase = bp.round
        and mt.advancing_team_id = bp.predicted_team_id
    ) then case bp.round
             when 'dieciseisavos' then 3
             when 'octavos'       then 5
             when 'cuartos'       then 8
             when 'semifinal'     then 12
             when 'final'         then 20
             when 'tercer_puesto' then 6
             else 0
           end
    else 0
  end;
end;
$$;

-- Recalcular el cuadro también cuando se cierra/corrige un partido.
create or replace function public.on_match_finished()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and new.home_score_90 is not null then
    perform public.calculate_match_points(new.id);
    perform public.calculate_bracket_points();
  end if;
  return new;
end;
$$;

-- =========================================================
-- 5. RLS
-- =========================================================
alter table public.bracket_predictions enable row level security;

-- Ver: las propias siempre; ajenas solo tras el cierre y en grupo compartido.
create policy "bracket_select" on public.bracket_predictions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      public.bracket_is_locked()
      and (
        (pool_id is null and public.shares_pool(user_id))
        or (pool_id is not null and public.is_pool_member(pool_id))
      )
    )
  );

create policy "bracket_insert_own" on public.bracket_predictions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and public.bracket_is_open()
  );

create policy "bracket_update_own" on public.bracket_predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and public.bracket_is_open()
  );

-- =========================================================
-- 6. Tabla: total = partidos (grupos+knockout) + especiales + cuadro
--    Pre-agregamos cada fuente por separado para evitar multiplicar filas.
-- =========================================================
create or replace function public.pool_leaderboard(p_pool_id uuid)
returns table(
  rank         bigint,
  user_id      uuid,
  display_name text,
  avatar_url   text,
  total_points bigint,
  pred_count   bigint
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_pool_member(p_pool_id) and not public.is_admin() then
    raise exception 'No eres miembro de ese grupo';
  end if;

  return query
  with member as (
    select pm.user_id from public.pool_members pm where pm.pool_id = p_pool_id
  ),
  match_pts as (
    select p.user_id, coalesce(sum(p.points_awarded), 0) as pts, count(p.id) as cnt
    from public.predictions p
    where p.pool_id is null and p.points_awarded is not null
      and p.user_id in (select user_id from member)
    group by p.user_id
  ),
  special_pts as (
    select sb.user_id, coalesce(sb.points_awarded, 0) as pts
    from public.special_bets sb
    where sb.pool_id is null
      and sb.user_id in (select user_id from member)
  ),
  bracket_pts as (
    select b.user_id, coalesce(sum(b.points_awarded), 0) as pts
    from public.bracket_predictions b
    where b.pool_id is null and b.points_awarded is not null
      and b.user_id in (select user_id from member)
    group by b.user_id
  ),
  totals as (
    select
      mem.user_id,
      (coalesce(mp.pts, 0) + coalesce(sp.pts, 0) + coalesce(bp.pts, 0))::bigint as total,
      coalesce(mp.cnt, 0)::bigint as cnt
    from member mem
    left join match_pts   mp on mp.user_id = mem.user_id
    left join special_pts sp on sp.user_id = mem.user_id
    left join bracket_pts bp on bp.user_id = mem.user_id
  )
  select
    row_number() over (order by t.total desc, t.cnt desc) as rank,
    t.user_id,
    prof.display_name,
    prof.avatar_url,
    t.total,
    t.cnt
  from totals t
  join public.profiles prof on prof.id = t.user_id
  order by t.total desc, t.cnt desc;
end;
$$;
