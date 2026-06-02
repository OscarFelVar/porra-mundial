-- Porra Mundial 2026 — cerrar pronósticos 15 min ANTES del kickoff
-- Margen de seguridad (evita ediciones de último segundo / ver alineaciones).
-- Toca: el RPC (autoritativo), las políticas RLS y el cierre del cuadro.
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. RPC de pronósticos: cierre 15 min antes
-- =========================================================
create or replace function public.upsert_prediction(
  p_match_id           uuid,
  p_pool_id            uuid,
  p_home_score         int,
  p_away_score         int,
  p_advancing_team_id  uuid default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.matches
    where id = p_match_id and now() < kickoff_at - interval '15 minutes'
  ) then
    raise exception 'Los pronósticos de este partido están cerrados';
  end if;

  if p_pool_id is not null and not public.is_pool_member(p_pool_id) then
    raise exception 'No eres miembro de ese grupo';
  end if;

  if p_pool_id is null then
    insert into public.predictions
      (user_id, match_id, pool_id, home_score, away_score, advancing_team_id)
    values
      (auth.uid(), p_match_id, null, p_home_score, p_away_score, p_advancing_team_id)
    on conflict (user_id, match_id) where pool_id is null
      do update set
        home_score        = excluded.home_score,
        away_score        = excluded.away_score,
        advancing_team_id = excluded.advancing_team_id,
        updated_at        = now();
  else
    insert into public.predictions
      (user_id, match_id, pool_id, home_score, away_score, advancing_team_id)
    values
      (auth.uid(), p_match_id, p_pool_id, p_home_score, p_away_score, p_advancing_team_id)
    on conflict (user_id, match_id, pool_id) where pool_id is not null
      do update set
        home_score        = excluded.home_score,
        away_score        = excluded.away_score,
        advancing_team_id = excluded.advancing_team_id,
        updated_at        = now();
  end if;
end;
$$;

-- =========================================================
-- 2. Políticas RLS (defensa en profundidad + cuándo se ven las ajenas)
-- =========================================================
drop policy if exists "predictions_select"      on public.predictions;
drop policy if exists "predictions_insert_own"  on public.predictions;
drop policy if exists "predictions_update_own"  on public.predictions;

create policy "predictions_select" on public.predictions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      exists (
        select 1 from public.matches m
        where m.id = predictions.match_id
          and now() >= m.kickoff_at - interval '15 minutes'
      )
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
    and exists (
      select 1 from public.matches m
      where m.id = match_id and now() < m.kickoff_at - interval '15 minutes'
    )
  );

create policy "predictions_update_own" on public.predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (pool_id is null or public.is_pool_member(pool_id))
    and exists (
      select 1 from public.matches m
      where m.id = match_id and now() < m.kickoff_at - interval '15 minutes'
    )
  );

-- =========================================================
-- 3. Cuadro de eliminatorias: también cierra 15 min antes del primer 16avo
-- =========================================================
create or replace function public.bracket_is_open()
returns boolean language sql security definer set search_path = public stable as $$
  select public.bracket_first_kickoff() is not null
     and now() < public.bracket_first_kickoff() - interval '15 minutes';
$$;

create or replace function public.bracket_is_locked()
returns boolean language sql security definer set search_path = public stable as $$
  select public.bracket_first_kickoff() is not null
     and now() >= public.bracket_first_kickoff() - interval '15 minutes';
$$;
