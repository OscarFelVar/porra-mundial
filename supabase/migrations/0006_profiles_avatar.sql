-- Porra Mundial 2026 — perfil: foto de avatar
-- Aplicar en el SQL editor de Supabase o con `supabase db push`.

-- =========================================================
-- 1. Columna de avatar (display_name ya existe y ya es editable).
-- =========================================================
alter table public.profiles add column if not exists avatar_url text;

-- =========================================================
-- 2. La tabla de posiciones también devuelve el avatar.
--    (misma firma que en 0003 + avatar_url)
--    Cambia el tipo de retorno (nueva columna), así que hay que
--    DROP + CREATE: `create or replace` no permite alterar el retorno.
-- =========================================================
drop function if exists public.pool_leaderboard(uuid);

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
      order by coalesce(sum(pred.points_awarded), 0) desc,
               count(pred.id) desc
    )                                     as rank,
    pm.user_id,
    prof.display_name,
    prof.avatar_url,
    coalesce(sum(pred.points_awarded), 0) as total_points,
    count(pred.id)                        as pred_count
  from public.pool_members pm
  join public.profiles prof on prof.id = pm.user_id
  left join public.predictions pred
         on pred.user_id   = pm.user_id
        and pred.pool_id   is null
        and pred.points_awarded is not null
  where pm.pool_id = p_pool_id
  group by pm.user_id, prof.display_name, prof.avatar_url
  order by total_points desc, pred_count desc;
end;
$$;

-- =========================================================
-- 3. Storage: bucket público de avatares + políticas por dueño.
--    Cada usuario sube/edita/borra solo dentro de su carpeta {user_id}/...
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read_all"    on storage.objects;
drop policy if exists "avatars_insert_own"  on storage.objects;
drop policy if exists "avatars_update_own"  on storage.objects;
drop policy if exists "avatars_delete_own"  on storage.objects;

create policy "avatars_read_all" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
