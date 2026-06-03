-- Porra Mundial 2026 — fix: "column reference user_id is ambiguous" en pool_leaderboard
-- El CTE usaba 'user_id', que choca con la columna de salida del RETURNS TABLE.
-- Se renombra la columna interna a 'uid' (todo cualificado, sin ambigüedad).
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
      coalesce(mp.cnt, 0)::bigint as cnt
    from member mem
    left join match_pts   mp on mp.uid = mem.uid
    left join special_pts sp on sp.uid = mem.uid
    left join bracket_pts bp on bp.uid = mem.uid
  )
  select
    row_number() over (order by t.total desc, t.cnt desc) as rank,
    t.uid as user_id,
    prof.display_name,
    prof.avatar_url,
    t.total as total_points,
    t.cnt as pred_count
  from totals t
  join public.profiles prof on prof.id = t.uid
  order by t.total desc, t.cnt desc;
end;
$$;
