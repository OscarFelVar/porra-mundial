-- =========================================================
-- Función upsert_prediction
-- Maneja los dos índices únicos parciales (default y por grupo)
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
    select 1 from public.matches where id = p_match_id and now() < kickoff_at
  ) then
    raise exception 'El partido ya ha comenzado o no existe';
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
        home_score          = excluded.home_score,
        away_score          = excluded.away_score,
        advancing_team_id   = excluded.advancing_team_id,
        updated_at          = now();
  else
    insert into public.predictions
      (user_id, match_id, pool_id, home_score, away_score, advancing_team_id)
    values
      (auth.uid(), p_match_id, p_pool_id, p_home_score, p_away_score, p_advancing_team_id)
    on conflict (user_id, match_id, pool_id) where pool_id is not null
      do update set
        home_score          = excluded.home_score,
        away_score          = excluded.away_score,
        advancing_team_id   = excluded.advancing_team_id,
        updated_at          = now();
  end if;
end;
$$;

-- =========================================================
-- Datos de prueba (dev) — equipos y partidos de muestra
-- =========================================================
insert into public.teams (id, name, code, group_label) values
  ('00000000-0000-0000-0000-000000000001', 'España',      'ESP', 'A'),
  ('00000000-0000-0000-0000-000000000002', 'Marruecos',   'MAR', 'A'),
  ('00000000-0000-0000-0000-000000000003', 'Argentina',   'ARG', 'B'),
  ('00000000-0000-0000-0000-000000000004', 'Francia',     'FRA', 'B'),
  ('00000000-0000-0000-0000-000000000005', 'Brasil',      'BRA', 'C'),
  ('00000000-0000-0000-0000-000000000006', 'Alemania',    'GER', 'C')
on conflict (id) do nothing;

-- Partido bloqueado (ayer) — para probar estado cerrado
insert into public.matches (home_team_id, away_team_id, phase, group_label, kickoff_at, status)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'grupos', 'A',
  now() - interval '1 day',
  'finished'
) on conflict do nothing;

-- Partido abierto 1
insert into public.matches (home_team_id, away_team_id, phase, group_label, kickoff_at)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  'grupos', 'B',
  '2026-06-14 18:00:00+00'
) on conflict do nothing;

-- Partido abierto 2
insert into public.matches (home_team_id, away_team_id, phase, group_label, kickoff_at)
values (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  'grupos', 'C',
  '2026-06-17 21:00:00+00'
) on conflict do nothing;
