-- Porra Mundial 2026 — restaurar WHERE siempre-cierto en calculate_bracket_points
-- La migration 0022 reemplazó la función para marcar picks pendientes como NULL,
-- pero olvidó el WHERE bp.id is not null que exige la extensión safeupdate de Supabase.
-- Sin él, el trigger revienta con "UPDATE requires a WHERE clause" al guardar resultados.

create or replace function public.calculate_bracket_points()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.bracket_predictions bp
  set points_awarded =
    case
      -- El equipo avanzó en esa ronda → correcto
      when exists (
        select 1 from public.matches mt
        where mt.phase = bp.round
          and mt.advancing_team_id = bp.predicted_team_id
      ) then
        case bp.round
          when 'dieciseisavos' then 3
          when 'octavos'       then 5
          when 'cuartos'       then 8
          when 'semifinal'     then 12
          when 'final'         then 20
          when 'tercer_puesto' then 6
          else 0
        end

      -- El equipo jugó en esa ronda y hay advancing_team_id
      -- → partido decidido y el equipo no avanzó: incorrecto
      when exists (
        select 1 from public.matches mt
        where mt.phase = bp.round
          and mt.advancing_team_id is not null
          and (mt.home_team_id = bp.predicted_team_id
               or mt.away_team_id = bp.predicted_team_id)
      ) then 0

      -- Partido aún sin ganador → pendiente
      else null
    end
  where bp.id is not null;  -- WHERE siempre-cierto: satisface safeupdate sin filtrar filas
end;
$$;
