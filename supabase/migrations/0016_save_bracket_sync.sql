-- Porra Mundial 2026 — guardado del cuadro como SINCRONIZACIÓN completa
-- Antes: saveBracketPicks hacía upsert pick a pick y NUNCA borraba. Si la cascada
-- eliminaba elecciones (al cambiar una ronda previa), quedaban filas "fantasma"
-- en bracket_predictions que reaparecían al recargar y se puntuaban igual.
-- Ahora: una sola RPC atómica que borra lo que ya no está y upserta lo enviado.
-- (delete directo no se puede desde el cliente: 0011 revocó delete; por eso RPC SECURITY DEFINER.)
-- Aplicar en el SQL editor de Supabase.

create or replace function public.save_bracket(p_pool_id uuid, p_picks jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.bracket_is_open() then
    raise exception 'El cuadro de eliminatorias está cerrado o aún no disponible';
  end if;
  if p_pool_id is not null and not public.is_pool_member(p_pool_id) then
    raise exception 'No eres miembro de ese grupo';
  end if;

  -- 1. Borra las llaves del usuario que ya no vienen en el set enviado.
  delete from public.bracket_predictions bp
  where bp.user_id = auth.uid()
    and bp.pool_id is not distinct from p_pool_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_picks) as x(round text, slot int, team_id uuid)
      where x.round = bp.round::text and x.slot = bp.slot
    );

  -- 2. Inserta/actualiza las enviadas (el conflict target depende de pool_id por
  --    los índices únicos parciales de 0008).
  if p_pool_id is null then
    insert into public.bracket_predictions (user_id, pool_id, round, slot, predicted_team_id)
    select auth.uid(), null, x.round::public.match_phase, x.slot, x.team_id
    from jsonb_to_recordset(p_picks) as x(round text, slot int, team_id uuid)
    on conflict (user_id, round, slot) where pool_id is null
      do update set predicted_team_id = excluded.predicted_team_id, updated_at = now();
  else
    insert into public.bracket_predictions (user_id, pool_id, round, slot, predicted_team_id)
    select auth.uid(), p_pool_id, x.round::public.match_phase, x.slot, x.team_id
    from jsonb_to_recordset(p_picks) as x(round text, slot int, team_id uuid)
    on conflict (user_id, round, slot, pool_id) where pool_id is not null
      do update set predicted_team_id = excluded.predicted_team_id, updated_at = now();
  end if;
end;
$$;
