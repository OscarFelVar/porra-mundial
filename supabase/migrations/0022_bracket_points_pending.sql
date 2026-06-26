-- Porra Mundial 2026 — corregir calculate_bracket_points para estado pendiente
-- Problema anterior: en cuanto terminaba el primer partido de una ronda, todos los
-- picks de equipos que aún no habían jugado se ponían a 0 (incorrecto) porque
-- "no se encontraba advancing_team_id para ese equipo". Confundía a los usuarios.
-- Solución: solo asignar 0 si el equipo YA jugó un partido en esa ronda Y ese
-- partido tiene advancing_team_id distinto al predicho. Si el partido aún no tiene
-- advancing_team_id, dejar points_awarded = NULL (pendiente).

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

      -- El equipo jugó en esa ronda (era local o visitante) y hay advancing_team_id
      -- → el partido está decidido y el equipo no avanzó: incorrecto
      when exists (
        select 1 from public.matches mt
        where mt.phase = bp.round
          and mt.advancing_team_id is not null
          and (mt.home_team_id = bp.predicted_team_id
               or mt.away_team_id = bp.predicted_team_id)
      ) then 0

      -- El equipo no aparece aún en ningún partido de esa ronda (cruces no
      -- definidos todavía) o el partido existe pero aún no tiene ganador:
      -- dejar pendiente (null)
      else null
    end;
end;
$$;
