-- Porra Mundial 2026 — motor de puntos COMPLETO (reglas del README)
-- Reemplaza el scoring 3/1 de 0003 por: grupos 5/3, eliminatorias escaladas
-- por ronda + bonus de "clasificado", y puntuación de apuestas especiales.
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. Puntos por partido
--    Marcador a 90' (exacto / resultado / 0) + bonus por acertar
--    quién pasa (solo eliminatorias). El "clasificado" del usuario:
--    si pronosticó no-empate → su ganador; si empate → su advancing_team_id.
-- =========================================================
create or replace function public.calculate_match_points(p_match_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  m       record;
  v_exact  int;
  v_result int;
  v_adv    int;
begin
  select phase, home_score_90, away_score_90, advancing_team_id, home_team_id, away_team_id
  into m
  from public.matches
  where id = p_match_id and status = 'finished';

  if not found or m.home_score_90 is null or m.away_score_90 is null then
    return;  -- sin resultado registrado: nada que puntuar
  end if;

  -- Puntos por ronda: exacto / resultado / bonus clasificado
  case m.phase
    when 'grupos'        then v_exact := 5;  v_result := 3;  v_adv := 0;
    when 'dieciseisavos' then v_exact := 6;  v_result := 4;  v_adv := 3;
    when 'octavos'       then v_exact := 8;  v_result := 5;  v_adv := 4;
    when 'cuartos'       then v_exact := 10; v_result := 6;  v_adv := 6;
    when 'semifinal'     then v_exact := 12; v_result := 8;  v_adv := 8;
    when 'final'         then v_exact := 15; v_result := 10; v_adv := 12;  -- +12 = campeón
    when 'tercer_puesto' then v_exact := 15; v_result := 10; v_adv := 0;
    else                      v_exact := 5;  v_result := 3;  v_adv := 0;
  end case;

  -- Recalcula SIEMPRE (permite correcciones del admin tras el cierre)
  update public.predictions p
  set points_awarded =
    -- (a) marcador a 90'
    (case
       when p.home_score = m.home_score_90 and p.away_score = m.away_score_90
         then v_exact
       when sign(p.home_score - p.away_score) = sign(m.home_score_90 - m.away_score_90)
         then v_result
       else 0
     end)
    +
    -- (b) bonus por acertar quién avanza (solo eliminatorias)
    (case
       when v_adv > 0
            and m.advancing_team_id is not null
            and (case
                   when p.home_score > p.away_score then m.home_team_id
                   when p.away_score > p.home_score then m.away_team_id
                   else p.advancing_team_id
                 end) = m.advancing_team_id
         then v_adv
       else 0
     end)
  where p.match_id = p_match_id;
end;
$$;

-- El trigger recalcula también ante correcciones (no solo en la transición).
create or replace function public.on_match_finished()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and new.home_score_90 is not null then
    perform public.calculate_match_points(new.id);
  end if;
  return new;
end;
$$;

-- =========================================================
-- 2. Puntos de apuestas especiales
--    Campeón 15 · Subcampeón 8 · Goleador 10 (cada parte cuenta
--    solo si su resultado real ya está fijado en app_settings).
-- =========================================================
create or replace function public.calculate_special_points()
returns void
language plpgsql security definer set search_path = public as $$
declare
  s record;
begin
  select result_champion_team_id, result_runnerup_team_id, result_top_scorer
  into s from public.app_settings where id = 1;

  update public.special_bets sb
  set points_awarded =
      (case when s.result_champion_team_id is not null
                 and sb.champion_team_id = s.result_champion_team_id then 15 else 0 end)
    + (case when s.result_runnerup_team_id is not null
                 and sb.runnerup_team_id = s.result_runnerup_team_id then 8 else 0 end)
    + (case when s.result_top_scorer is not null and sb.top_scorer is not null
                 and lower(btrim(sb.top_scorer)) = lower(btrim(s.result_top_scorer)) then 10 else 0 end);
end;
$$;

-- Recalcula las especiales cuando el admin fija/corrige los resultados reales.
create or replace function public.on_app_settings_results()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.calculate_special_points();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_results on public.app_settings;
create trigger trg_app_settings_results
  after update on public.app_settings
  for each row execute function public.on_app_settings_results();

-- =========================================================
-- 3. Tabla de clasificación: total = puntos de partidos + apuestas especiales
--    (mismas columnas que 0006: create or replace sin drop)
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
  select
    row_number() over (
      order by coalesce(sum(pred.points_awarded), 0) + coalesce(max(sb.points_awarded), 0) desc,
               count(pred.id) desc
    )                                                                              as rank,
    pm.user_id,
    prof.display_name,
    prof.avatar_url,
    (coalesce(sum(pred.points_awarded), 0) + coalesce(max(sb.points_awarded), 0))::bigint as total_points,
    count(pred.id)                                                                 as pred_count
  from public.pool_members pm
  join public.profiles prof on prof.id = pm.user_id
  left join public.predictions pred
         on pred.user_id   = pm.user_id
        and pred.pool_id   is null
        and pred.points_awarded is not null
  left join public.special_bets sb
         on sb.user_id = pm.user_id
        and sb.pool_id is null
  where pm.pool_id = p_pool_id
  group by pm.user_id, prof.display_name, prof.avatar_url
  order by total_points desc, pred_count desc;
end;
$$;

-- Recalcular puntos de partidos ya finalizados con las nuevas reglas:
do $$
declare r record;
begin
  for r in select id from public.matches where status = 'finished' and home_score_90 is not null loop
    perform public.calculate_match_points(r.id);
  end loop;
end $$;
