# Porra Mundial 2026

Porra mundialista para jugar con amigos y familia: cada participante
pronostica los partidos, suma puntos según su acierto y compite en una tabla
de posiciones que se actualiza en vivo.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · motion |
| Backend / BD | Supabase (Postgres · Auth · Storage · RLS) |
| PWA | Serwist (service worker, instalable) |
| Resultados | football-data.org (partidos + plantillas) |
| Hosting | Vercel (funciones en `fra1`, junto a la BD) |

## Arquitectura

- **Auth:** email + contraseña (registro abierto, sin confirmación por correo).
- **Multicliente:** cualquiera se une a un **grupo** (`pools`) con un código de
  invitación; cada grupo tiene su propia tabla. Crear un grupo es exclusivo del
  **administrador** y **no implica participar** (para jugar, hay que unirse con
  el código). Los datos del torneo (`teams`, `matches`, `players`) son globales.
- **Pronósticos:** marcador por partido en la fase de grupos. Cada partido se
  **cierra 15 minutos antes del inicio** (derivado de `kickoff_at`).
- **Eliminatorias:** **cuadro completo** que se rellena de una vez cuando se
  conocen los dieciseisavos — eliges quién avanza en cada llave hasta el campeón
  (sin marcadores). Se cierra 15 min antes del primer dieciseisavos.
- **Apuestas especiales:** máximo goleador, MVP y mejor portero, con
  autocompletar sobre las plantillas reales. Cierran antes del primer partido.
- **Resultados:** un cron externo (cron-job.org) llama a `/api/sync` para
  actualizar marcadores desde football-data; el admin puede corregir.
- **Seguridad:** RLS + privilegios por columna (nadie puede auto-asignarse
  admin ni escribir sus propios puntos; toda escritura pasa por RPC).

## Lógica de puntuación

**Fase de grupos** (por marcador)
- Marcador exacto: **5 pts** · Resultado acertado (ganador/empate): **3 pts**

**Eliminatorias** (por acertar quién avanza en cada ronda)

| Ronda | Puntos por acierto |
|---|---|
| Dieciseisavos | 3 |
| Octavos | 5 |
| Cuartos | 8 |
| Semifinal | 12 |
| Final (campeón) | 20 |
| Tercer puesto | 6 |

**Apuestas especiales:** máximo goleador (10) · MVP (12) · mejor portero (8).

La tabla suma fase de grupos + eliminatorias + apuestas especiales.

## Desarrollo local

```bash
cp .env.example .env.local   # rellenar claves
npm install
npm run dev
```

Aplicar el esquema en Supabase: ejecutar las migraciones de
`supabase/migrations/` en orden en el SQL editor.

> El build de producción usa webpack (`next build --webpack`) porque el service
> worker (Serwist) se integra vía webpack, no Turbopack.

## Estado

- [x] Auth (email + contraseña), grupos, perfiles.
- [x] Pronósticos de grupos, motor de puntos, tabla en vivo.
- [x] Apuestas especiales con autocompletar de jugadores.
- [x] Cuadro de eliminatorias (rellenable) + visualización.
- [x] PWA instalable.
- [ ] Sync automático de `advancing_team_id` (eliminatorias) y panel de admin.
- [ ] Recordatorios e indicador de pronósticos pendientes.

## Créditos

Iconos:
- Trofeo (copa mundial) por [BankSeeNgern](https://www.flaticon.es/iconos-gratis/copa-mundial) — Flaticon.
- Balón (pelota) por [Freepik](https://www.flaticon.es/iconos-gratis/pelota) — Flaticon.
