-- =========================================================
-- Motor de puntos
-- 3 pts = resultado exacto | 1 pt = resultado correcto | 0 = fallo
-- =========================================================
create or replace function public.calculate_match_points(p_match_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_home int;
  v_away int;
begin
  select home_score_90, away_score_90
  into v_home, v_away
  from public.matches
  where id = p_match_id and status = 'finished';

  if v_home is null then
    raise exception 'Partido sin resultado registrado';
  end if;

  update public.predictions
  set points_awarded = case
    when home_score = v_home and away_score = v_away
      then 3
    when sign(home_score - away_score) = sign(v_home - v_away)
      then 1
    else 0
  end
  where match_id = p_match_id
    and points_awarded is null;
end;
$$;

-- Trigger: se ejecuta automáticamente cuando se guarda el resultado de un partido
create or replace function public.on_match_finished()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished'
    and new.home_score_90 is not null
    and (old.status is distinct from 'finished' or old.home_score_90 is null)
  then
    perform public.calculate_match_points(new.id);
  end if;
  return new;
end;
$$;

create trigger trg_match_finished
  after update on public.matches
  for each row execute function public.on_match_finished();

-- =========================================================
-- Tabla de clasificación por grupo (pool)
-- Usa predicciones por defecto (pool_id null); más adelante
-- se añadirá la lógica de overrides por grupo.
-- =========================================================
create or replace function public.pool_leaderboard(p_pool_id uuid)
returns table(
  rank         bigint,
  user_id      uuid,
  display_name text,
  total_points bigint,
  pred_count   bigint
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_pool_member(p_pool_id) and not public.is_admin() then
    raise exception 'No eres miembro de ese grupo';
  end if;

  return query
  select
    row_number() over (
      order by coalesce(sum(pred.points_awarded), 0) desc,
               count(pred.id) desc
    )                                     as rank,
    pm.user_id,
    prof.display_name,
    coalesce(sum(pred.points_awarded), 0) as total_points,
    count(pred.id)                        as pred_count
  from public.pool_members pm
  join public.profiles prof on prof.id = pm.user_id
  left join public.predictions pred
         on pred.user_id   = pm.user_id
        and pred.pool_id   is null
        and pred.points_awarded is not null
  where pm.pool_id = p_pool_id
  group by pm.user_id, prof.display_name
  order by total_points desc, pred_count desc;
end;
$$;

-- =========================================================
-- Resultado de prueba: España 2-1 Marruecos (partido cerrado)
-- El trigger calculará puntos automáticamente.
-- =========================================================
update public.matches
set home_score_90 = 2, away_score_90 = 1, status = 'finished'
where home_team_id = '00000000-0000-0000-0000-000000000001'
  and away_team_id = '00000000-0000-0000-0000-000000000002';
