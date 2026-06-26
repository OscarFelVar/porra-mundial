-- Porra Mundial 2026 — exponer exact_count en pool_leaderboard
-- El CTE exact_pts ya calculaba los aciertos exactos (se usaba solo para desempatar).
-- Ahora también se devuelve como columna para mostrarlo en el frontend.

create or replace function public.pool_leaderboard(p_pool_id uuid)
returns table(
  rank         bigint,
  user_id      uuid,
  display_name text,
  avatar_url   text,
  total_points bigint,
  pred_count   bigint,
  exact_count  bigint
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_pool_member(p_pool_id) and not public.is_admin() then
    raise exception 'No eres miembro de ese grupo';
  end if;

  return query
  with settings as (
    select special_bets_deadline,
           (select min(kickoff_at) from public.matches where phase = 'dieciseisavos') as bracket_first
    from public.app_settings where id = 1
  ),
  member as (
    select pm.user_id as uid, pm.joined_at as joined
    from public.pool_members pm
    where pm.pool_id = p_pool_id
  ),
  match_pts as (
    select p.user_id as uid, coalesce(sum(p.points_awarded), 0) as pts, count(p.id) as cnt
    from public.predictions p
    join public.matches m  on m.id = p.match_id
    join member mem        on mem.uid = p.user_id
    where p.pool_id is null
      and m.kickoff_at > mem.joined
    group by p.user_id
  ),
  exact_pts as (
    select p.user_id as uid, count(*) as exact_hits
    from public.predictions p
    join public.matches m  on m.id = p.match_id
    join member mem        on mem.uid = p.user_id
    where p.pool_id is null
      and m.status = 'finished'
      and m.home_score_90 is not null and m.away_score_90 is not null
      and p.home_score = m.home_score_90
      and p.away_score = m.away_score_90
      and m.kickoff_at > mem.joined
    group by p.user_id
  ),
  special_pts as (
    select sb.user_id as uid, coalesce(sb.points_awarded, 0) as pts
    from public.special_bets sb
    join member mem  on mem.uid = sb.user_id
    cross join settings s
    where sb.pool_id is null
      and (s.special_bets_deadline is null or mem.joined < s.special_bets_deadline)
  ),
  bracket_pts as (
    select b.user_id as uid, coalesce(sum(b.points_awarded), 0) as pts
    from public.bracket_predictions b
    join member mem  on mem.uid = b.user_id
    cross join settings s
    where b.pool_id is null and b.points_awarded is not null
      and (s.bracket_first is null or mem.joined < s.bracket_first)
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
    rank() over (order by t.total desc, t.exact desc) as rank,
    t.uid as user_id,
    prof.display_name,
    prof.avatar_url,
    t.total as total_points,
    t.cnt as pred_count,
    t.exact as exact_count
  from totals t
  join public.profiles prof on prof.id = t.uid
  order by t.total desc, t.exact desc, prof.display_name asc;
end;
$$;
