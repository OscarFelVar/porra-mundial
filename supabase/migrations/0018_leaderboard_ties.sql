-- Porra Mundial 2026 — empates en la tabla + desempate por marcadores exactos
-- Antes: row_number() partía SIEMPRE los empates (por nº de pronósticos), así que
-- nunca se veían. Ahora: rank() de competición (los empatados comparten posición)
-- ordenando por puntos y, a igualdad, por nº de MARCADORES EXACTOS acertados.
-- Solo es empate real si coinciden en puntos Y en exactos.
-- El formato de salida NO cambia (rank, user_id, display_name, avatar_url,
-- total_points, pred_count) → create or replace sin drop.
-- Aplicar en el SQL editor de Supabase.

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
  with member as (
    select pm.user_id as uid
    from public.pool_members pm
    where pm.pool_id = p_pool_id
  ),
  match_pts as (
    select p.user_id as uid, coalesce(sum(p.points_awarded), 0) as pts, count(p.id) as cnt
    from public.predictions p
    where p.pool_id is null and p.points_awarded is not null
      and p.user_id in (select uid from member)
    group by p.user_id
  ),
  -- Marcadores exactos: pronóstico = resultado real (90') en partidos finalizados.
  exact_pts as (
    select p.user_id as uid, count(*) as exact_hits
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.pool_id is null
      and m.status = 'finished'
      and m.home_score_90 is not null and m.away_score_90 is not null
      and p.home_score = m.home_score_90
      and p.away_score = m.away_score_90
      and p.user_id in (select uid from member)
    group by p.user_id
  ),
  special_pts as (
    select sb.user_id as uid, coalesce(sb.points_awarded, 0) as pts
    from public.special_bets sb
    where sb.pool_id is null
      and sb.user_id in (select uid from member)
  ),
  bracket_pts as (
    select b.user_id as uid, coalesce(sum(b.points_awarded), 0) as pts
    from public.bracket_predictions b
    where b.pool_id is null and b.points_awarded is not null
      and b.user_id in (select uid from member)
    group by b.user_id
  ),
  totals as (
    select
      mem.uid,
      (coalesce(mp.pts, 0) + coalesce(sp.pts, 0) + coalesce(bp.pts, 0))::bigint as total,
      coalesce(mp.cnt, 0)::bigint as cnt,
      coalesce(ep.exact_hits, 0)::bigint as exact
    from member mem
    left join match_pts   mp on mp.uid = mem.uid
    left join special_pts sp on sp.uid = mem.uid
    left join bracket_pts bp on bp.uid = mem.uid
    left join exact_pts   ep on ep.uid = mem.uid
  )
  select
    -- Ranking de competición: empatados (mismo total Y mismos exactos) comparten posición.
    rank() over (order by t.total desc, t.exact desc) as rank,
    t.uid as user_id,
    prof.display_name,
    prof.avatar_url,
    t.total as total_points,
    t.cnt as pred_count
  from totals t
  join public.profiles prof on prof.id = t.uid
  order by t.total desc, t.exact desc, prof.display_name asc;
end;
$$;
