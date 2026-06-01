-- Porra Mundial 2026 — roles: solo el superadmin crea grupos
-- Aplicar en el SQL editor de Supabase o con `supabase db push`.

-- =========================================================
-- 1. Crear grupos pasa a ser exclusivo del admin global.
--    (misma firma que en 0001; solo añade el guard inicial)
-- =========================================================
create or replace function public.create_pool(p_name text)
returns public.pools
language plpgsql security definer set search_path = public as $$
declare
  v_pool public.pools;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede crear grupos';
  end if;

  insert into public.pools (name, invite_code, owner_id)
  values (p_name, upper(substr(md5(gen_random_uuid()::text), 1, 8)), auth.uid())
  returning * into v_pool;

  insert into public.pool_members (pool_id, user_id, role)
  values (v_pool.id, auth.uid(), 'owner');

  return v_pool;
end;
$$;

-- =========================================================
-- 2. Designar al superadmin.
--    Requiere que el perfil ya exista (haber entrado al menos una vez).
-- =========================================================
-- Reemplaza el placeholder por el correo del superadmin antes de ejecutar.
update public.profiles
set is_admin = true
where email = 'CORREO_DEL_ADMIN';
