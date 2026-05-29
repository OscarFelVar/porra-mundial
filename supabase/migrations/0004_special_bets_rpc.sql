-- Upsert apuestas especiales (campeón, subcampeón, máximo goleador)
create or replace function public.upsert_special_bets(
  p_pool_id            uuid,
  p_champion_team_id   uuid,
  p_runnerup_team_id   uuid,
  p_top_scorer         text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.app_settings
    where special_bets_deadline is not null
      and now() >= special_bets_deadline
  ) then
    raise exception 'El plazo de apuestas especiales ha cerrado';
  end if;

  if p_pool_id is not null and not public.is_pool_member(p_pool_id) then
    raise exception 'No eres miembro de ese grupo';
  end if;

  if p_pool_id is null then
    insert into public.special_bets
      (user_id, pool_id, champion_team_id, runnerup_team_id, top_scorer)
    values
      (auth.uid(), null, p_champion_team_id, p_runnerup_team_id, p_top_scorer)
    on conflict (user_id) where pool_id is null
      do update set
        champion_team_id = excluded.champion_team_id,
        runnerup_team_id = excluded.runnerup_team_id,
        top_scorer       = excluded.top_scorer,
        updated_at       = now();
  else
    insert into public.special_bets
      (user_id, pool_id, champion_team_id, runnerup_team_id, top_scorer)
    values
      (auth.uid(), p_pool_id, p_champion_team_id, p_runnerup_team_id, p_top_scorer)
    on conflict (user_id, pool_id) where pool_id is not null
      do update set
        champion_team_id = excluded.champion_team_id,
        runnerup_team_id = excluded.runnerup_team_id,
        top_scorer       = excluded.top_scorer,
        updated_at       = now();
  end if;
end;
$$;

-- Deadline del Mundial 2026 (primer partido: 11 jun 21:00 UTC)
-- Descomenta esta línea cuando quieras activar el cierre automático:
-- update public.app_settings set special_bets_deadline = '2026-06-11 21:00:00+00' where id = 1;
