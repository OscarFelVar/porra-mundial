-- Porra Mundial 2026 — endurecimiento de seguridad
-- Evita que un participante (aunque sea developer) pueda, vía la API REST:
--   (a) auto-asignarse admin escribiendo profiles.is_admin
--   (b) inflar sus puntos escribiendo points_awarded en sus propias filas
-- Idea: la escritura directa a esas tablas se prohíbe; todo pasa por los RPC
-- (SECURITY DEFINER), que controlan qué columnas se tocan y respetan los plazos.
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. Perfiles: el usuario solo puede cambiar nombre y avatar.
--    is_admin queda blindado (ya no es columna escribible por authenticated).
-- =========================================================
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, avatar_url) on public.profiles to authenticated;

-- =========================================================
-- 2. Pronósticos, especiales y cuadro: prohibida la escritura directa.
--    Los RPC upsert_prediction / upsert_special_bets / upsert_bracket_pick
--    (SECURITY DEFINER) siguen funcionando: nunca tocan points_awarded y
--    aplican el cierre por kickoff / deadline.
-- =========================================================
revoke insert, update, delete on public.predictions        from anon, authenticated;
revoke insert, update, delete on public.special_bets        from anon, authenticated;
revoke insert, update, delete on public.bracket_predictions from anon, authenticated;

-- Nota: SELECT se mantiene (sigue filtrado por RLS). teams/matches/app_settings
-- ya eran solo-escritura-admin vía RLS, y al blindar is_admin nadie puede
-- escalar a admin para tocarlos.
