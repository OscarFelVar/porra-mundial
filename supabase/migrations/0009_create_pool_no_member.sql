-- Porra Mundial 2026 — crear grupo ≠ participar
-- El superadmin crea/administra grupos sin quedar como participante.
-- Para jugar en un grupo, hay que unirse con el código (join_pool).
-- Aplicar en el SQL editor de Supabase.

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

  -- (Antes aquí se insertaba al creador en pool_members con rol 'owner'.)
  -- Ahora NO: administras el grupo (eres owner) pero no apareces en la
  -- clasificación. Para jugar, únete con el código como cualquier otro.

  return v_pool;
end;
$$;
