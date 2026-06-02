-- Porra Mundial 2026 — rediseño de apuestas especiales
-- Fuera campeón y subcampeón (el campeón ya lo cubre el cuadro de eliminatorias).
-- Quedan: máximo goleador (10), MVP del Mundial (12), valla menos vencida / portero (8).
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. Esquema
-- =========================================================
alter table public.special_bets drop column if exists champion_team_id;
alter table public.special_bets drop column if exists runnerup_team_id;
alter table public.special_bets add column if not exists mvp text;
alter table public.special_bets add column if not exists best_goalkeeper text;

alter table public.app_settings drop column if exists result_champion_team_id;
alter table public.app_settings drop column if exists result_runnerup_team_id;
alter table public.app_settings add column if not exists result_mvp text;
alter table public.app_settings add column if not exists result_best_goalkeeper text;

-- =========================================================
-- 2. Upsert (nombres de jugador; sin equipos)
-- =========================================================
create or replace function public.upsert_special_bets(
  p_pool_id         uuid,
  p_top_scorer      text,
  p_mvp             text,
  p_best_goalkeeper text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.app_settings
    where special_bets_deadline is not null and now() >= special_bets_deadline
  ) then
    raise exception 'El plazo de apuestas especiales ha cerrado';
  end if;

  if p_pool_id is not null and not public.is_pool_member(p_pool_id) then
    raise exception 'No eres miembro de ese grupo';
  end if;

  if p_pool_id is null then
    insert into public.special_bets (user_id, pool_id, top_scorer, mvp, best_goalkeeper)
    values (auth.uid(), null, p_top_scorer, p_mvp, p_best_goalkeeper)
    on conflict (user_id) where pool_id is null
      do update set
        top_scorer      = excluded.top_scorer,
        mvp             = excluded.mvp,
        best_goalkeeper = excluded.best_goalkeeper,
        updated_at      = now();
  else
    insert into public.special_bets (user_id, pool_id, top_scorer, mvp, best_goalkeeper)
    values (auth.uid(), p_pool_id, p_top_scorer, p_mvp, p_best_goalkeeper)
    on conflict (user_id, pool_id) where pool_id is not null
      do update set
        top_scorer      = excluded.top_scorer,
        mvp             = excluded.mvp,
        best_goalkeeper = excluded.best_goalkeeper,
        updated_at      = now();
  end if;
end;
$$;

-- =========================================================
-- 3. Puntos: goleador 10, MVP 12, valla 8
-- =========================================================
create or replace function public.calculate_special_points()
returns void
language plpgsql security definer set search_path = public as $$
declare
  s record;
begin
  select result_top_scorer, result_mvp, result_best_goalkeeper
  into s from public.app_settings where id = 1;

  update public.special_bets sb
  set points_awarded =
      (case when s.result_top_scorer is not null and sb.top_scorer is not null
                 and lower(btrim(sb.top_scorer)) = lower(btrim(s.result_top_scorer)) then 10 else 0 end)
    + (case when s.result_mvp is not null and sb.mvp is not null
                 and lower(btrim(sb.mvp)) = lower(btrim(s.result_mvp)) then 12 else 0 end)
    + (case when s.result_best_goalkeeper is not null and sb.best_goalkeeper is not null
                 and lower(btrim(sb.best_goalkeeper)) = lower(btrim(s.result_best_goalkeeper)) then 8 else 0 end);
end;
$$;
