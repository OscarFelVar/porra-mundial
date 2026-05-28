# Porra Mundial 2026

Porra mundialista para empresa (Lexsys & SimplyLegal): cada participante
pronostica los partidos, suma puntos según su acierto y compite en una tabla
de posiciones que se actualiza en vivo.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · motion |
| Backend / BD | Supabase (Postgres · Auth · Edge Functions · Realtime · pg_cron) |
| Correo | Resend (magic link + recordatorios) |
| Resultados | football-data.org (API) + carga manual de respaldo |
| Hosting | Vercel (serverless, sin cold-starts) |

## Arquitectura

- **Auth:** magic link restringido por dominio (`@lexsys.ai` y SimplyLegal).
  La allowlist se valida en un trigger de Postgres al crear el usuario.
- **Datos:** `profiles`, `teams`, `matches`, `predictions`, `special_bets`,
  `app_settings`. Toda la seguridad vive en Row Level Security.
- **Cierre de pronósticos:** no se guarda como flag; se deriva de
  `matches.kickoff_at` directamente en las políticas RLS.
- **Resultados:** un job (`pg_cron` + Edge Function) consulta la API y
  actualiza marcadores; el admin siempre puede corregir a mano.
- **Tabla en vivo:** al recalcular puntos, Supabase Realtime empuja los
  cambios al cliente.

## Lógica de puntuación

**Fase de grupos**
- Marcador exacto: **5 pts** · Resultado correcto (ganador/empate): **3 pts**

**Eliminatorias** (puntos escalados por ronda + bonus por acertar quién avanza)

| Ronda | Exacto | Resultado | Clasificado |
|---|---|---|---|
| Dieciseisavos | 6 | 4 | +3 |
| Octavos | 8 | 5 | +4 |
| Cuartos | 10 | 6 | +6 |
| Semifinal | 12 | 8 | +8 |
| Final / 3.er puesto | 15 | 10 | +12 (campeón) |

El marcador se pronostica a los 90'. Sólo si se predice empate se elige quién
pasa en penales. Marcador y "clasificado" se puntúan por separado porque pueden
divergir en partidos definidos en prórroga/penales.

**Apuestas especiales:** campeón (15) · subcampeón (8) · goleador (10).

Las eliminatorias se pronostican de forma **progresiva** (sobre cruces reales);
un bracket en vivo va mostrando el avance real del torneo.

## Desarrollo local

```bash
cp .env.example .env.local   # rellenar claves
npm install
npm run dev
```

Aplicar el esquema en Supabase: ejecutar `supabase/migrations/0001_init.sql`
en el SQL editor (o `supabase db push`).

## Estado

- [x] Fase 0 — Setup: scaffold, esquema + RLS, env, base de UI.
- [ ] Fase 1 — Core: auth magic link, pronósticos de grupos, carga manual de
      resultados, motor de puntos, tabla en vivo.
- [ ] Fase 2 — Eliminatorias progresivas, apuestas especiales, panel admin.
- [ ] Fase 3 — Sync con API + recordatorios (pg_cron).
- [ ] Fase 4 — Pulido de portafolio: animaciones, datos demo, diagrama.
