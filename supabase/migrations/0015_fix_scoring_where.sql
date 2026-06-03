-- Porra Mundial 2026 — fix: "UPDATE requires a WHERE clause" en el recálculo de puntos
-- Supabase tiene activada la extensión `safeupdate`, que prohíbe UPDATE sin WHERE.
-- calculate_special_points() y calculate_bracket_points() hacían un UPDATE a toda
-- la tabla sin WHERE, así que reventaban al fijar resultados (especiales / cuadro).
-- Se les añade un WHERE siempre-cierto (id is not null) que mantiene el "actualiza
-- todas las filas" pero satisface a safeupdate. calculate_match_points ya tenía WHERE.
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. Especiales: goleador 10, MVP 12, portero 8
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
                 and lower(btrim(sb.best_goalkeeper)) = lower(btrim(s.result_best_goalkeeper)) then 8 else 0 end)
  where sb.id is not null;  -- WHERE siempre-cierto: actualiza todas las filas y pasa safeupdate
end;
$$;

-- =========================================================
-- 2. Cuadro: por cada elección, si ese equipo avanzó en esa ronda, suma sus puntos
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
  end
  where bp.id is not null;  -- WHERE siempre-cierto: actualiza todas las filas y pasa safeupdate
end;
$$;

-- =========================================================
-- 3. Recalcular ahora con las funciones ya corregidas
--    (idempotente: si no hay resultados fijados, deja todo en 0)
-- =========================================================
do $$
begin
  perform public.calculate_special_points();
  perform public.calculate_bracket_points();
end $$;
