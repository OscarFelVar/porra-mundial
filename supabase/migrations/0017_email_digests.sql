-- Porra Mundial 2026 — soporte para emails de evidencia (digests)
-- El cron (/api/sync, cada 15 min) envía a TU correo admin, vía Resend, una foto
-- de los pronósticos al cerrarse cada franja/cuadro/especiales; Apps Script reenvía
-- al grupo. Aquí solo: (1) idempotencia de envíos, (2) qué grupo recibe los emails.
-- Aplicar en el SQL editor de Supabase.

-- =========================================================
-- 1. Log de envíos: evita reenviar (el cron corre cada 15 min)
--    Lo escribe el cron con la service_role (que bypassa RLS).
-- =========================================================
create table if not exists public.email_log (
  kind    text not null,        -- 'group_slot' | 'bracket' | 'special'
  ref     text not null,        -- franja (kickoff ISO) | 'main'
  sent_at timestamptz not null default now(),
  primary key (kind, ref)
);

alter table public.email_log enable row level security;
-- Sin policies a propósito: ningún cliente authenticated/anon puede leer ni escribir.
-- Solo el cron (service_role) la toca, y la service_role se salta RLS.

-- =========================================================
-- 2. Grupo objetivo de los emails: SOLO uno recibe los digests.
--    null = no se envía a nadie. Se fija desde el panel de admin.
-- =========================================================
alter table public.app_settings
  add column if not exists digest_pool_id uuid references public.pools (id);
