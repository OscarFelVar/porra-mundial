import { createClient } from "@supabase/supabase-js"
import { revalidateTag } from "next/cache"
import { dispatchDigests, dispatchDailyReminders } from "@/lib/email/digests"

const BASE = "https://api.football-data.org/v4"

const PHASE_MAP: Record<string, string> = {
  GROUP_STAGE:    "grupos",
  LAST_32:        "dieciseisavos",
  LAST_16:        "octavos",
  QUARTER_FINALS: "cuartos",
  SEMI_FINALS:    "semifinal",
  THIRD_PLACE:    "tercer_puesto",
  FINAL:          "final",
}

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "scheduled",
  TIMED:     "scheduled",
  IN_PLAY:   "live",
  PAUSED:    "live",
  FINISHED:  "finished",
  AWARDED:   "finished",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FDMatch = Record<string, any>

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? ""
  return (
    auth === `Bearer ${process.env.SYNC_SECRET}` ||
    auth === `Bearer ${process.env.CRON_SECRET}`   // Vercel lo inyecta automáticamente
  )
}

// UUID del equipo placeholder "Por definir" — insertado en Supabase una sola vez.
// Se usa para LAST_32 cuyos equipos aún no están confirmados, garantizando que los
// 16 slots del bracket existan desde el principio con posiciones estables.
const TBD_TEAM_ID = "00000000-0000-0000-0000-000000000001"

// Solo sincroniza partidos (el cron del torneo no necesita re-sincronizar equipos)
async function syncMatches(teamMap: Record<string, string>) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const fdHeaders = { "X-Auth-Token": process.env.FOOTBALL_DATA_API_TOKEN! }

  const res = await fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers: fdHeaders })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`football-data matches: ${res.status} ${txt}`)
  }
  const { matches: fdMatches }: { matches: FDMatch[] } = await res.json()

  // Partidos ya FINALIZADOS en la BD: NO se tocan en el sync. Así una corrección
  // manual del admin (o un resultado ya fijado) nunca lo pisa football-data, ni se
  // borra con null mientras el feed gratuito se retrasa. Quien marca "finished" gana.
  const { data: finishedRows } = await supabase
    .from("matches")
    .select("external_id")
    .eq("status", "finished")
  const finishedExt = new Set((finishedRows ?? []).map((r) => r.external_id as string))

  const rows = fdMatches
    .filter((m) => {
      const phase = PHASE_MAP[m.stage] ?? "grupos"
      // LAST_32: incluir siempre — aunque los equipos sean TBD — para que los 16 slots
      // del bracket existan con posiciones estables desde el inicio de la fase.
      if (phase === "dieciseisavos") return true
      // Resto de fases: solo cuando ambos equipos están confirmados.
      return teamMap[String(m.homeTeam.id)] && teamMap[String(m.awayTeam.id)]
    })
    .filter((m) => !finishedExt.has(String(m.id))) // no pisar partidos ya finalizados
    .map((m) => ({
      external_id:   String(m.id),
      phase:         PHASE_MAP[m.stage] ?? "grupos",
      group_label:   m.group ? (m.group as string).replace("GROUP_", "") : null,
      home_team_id:  teamMap[String(m.homeTeam.id)] ?? TBD_TEAM_ID,
      away_team_id:  teamMap[String(m.awayTeam.id)] ?? TBD_TEAM_ID,
      kickoff_at:    m.utcDate as string,
      status:        STATUS_MAP[m.status] ?? "scheduled",
      home_score_90: (m.score?.fullTime?.home ?? null) as number | null,
      away_score_90: (m.score?.fullTime?.away ?? null) as number | null,
    }))

  if (rows.length) {
    const { error } = await supabase
      .from("matches")
      .upsert(rows, { onConflict: "external_id" })
    if (error) throw new Error(`upsert matches: ${error.message}`)
  }

  // Eliminatorias finalizadas: rellenar advancing_team_id (quién pasó de ronda).
  // football-data ya resuelve prórroga/penaltis en score.winner, que el marcador
  // a 90' no refleja. El AFTER UPDATE de `matches` dispara el recálculo del cuadro
  // (mismo trigger que usa el panel admin), así que basta con escribir la columna.
  // Solo lo fijamos cuando está null: así nunca pisamos una corrección manual del
  // admin ni re-disparamos el recálculo en cada sync de 15 min.
  const knockoutWinners = fdMatches
    .filter(
      (m) =>
        m.stage !== "GROUP_STAGE" &&
        STATUS_MAP[m.status] === "finished" &&
        (m.score?.winner === "HOME_TEAM" || m.score?.winner === "AWAY_TEAM") &&
        teamMap[String(m.homeTeam.id)] &&
        teamMap[String(m.awayTeam.id)],
    )
    .map((m) => ({
      external_id: String(m.id),
      advancing:
        m.score.winner === "HOME_TEAM"
          ? teamMap[String(m.homeTeam.id)]
          : teamMap[String(m.awayTeam.id)],
    }))

  for (const k of knockoutWinners) {
    const { error: advErr } = await supabase
      .from("matches")
      .update({ advancing_team_id: k.advancing })
      .eq("external_id", k.external_id)
      .is("advancing_team_id", null)
    if (advErr) throw new Error(`set advancing ${k.external_id}: ${advErr.message}`)
  }

  return rows.length
}

// Sincronización completa: equipos + partidos (para el primer sync o forzar refresh)
async function syncFull() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const fdHeaders = { "X-Auth-Token": process.env.FOOTBALL_DATA_API_TOKEN! }

  // Equipos
  const teamsRes = await fetch(`${BASE}/competitions/WC/teams?season=2026`, { headers: fdHeaders })
  if (!teamsRes.ok) {
    const txt = await teamsRes.text()
    throw new Error(`football-data teams: ${teamsRes.status} ${txt}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { teams: fdTeams }: { teams: Record<string, any>[] } = await teamsRes.json()

  const teamRows = fdTeams.map((t) => ({
    external_id: String(t.id),
    name:        t.name as string,
    code:        t.tla  as string | null,
    crest_url:   t.crest as string | null,
    flag_url:    (t.flag ?? null) as string | null,
  }))

  const { data: upsertedTeams, error: teamsErr } = await supabase
    .from("teams")
    .upsert(teamRows, { onConflict: "external_id" })
    .select("id, external_id")

  if (teamsErr) throw new Error(`upsert teams: ${teamsErr.message}`)

  const teamMap: Record<string, string> = Object.fromEntries(
    (upsertedTeams ?? []).map((t) => [t.external_id, t.id]),
  )

  // Jugadores (las plantillas vienen dentro de cada equipo: t.squad)
  const playerRows = fdTeams.flatMap((t) => {
    const teamId = teamMap[String(t.id)]
    if (!teamId || !Array.isArray(t.squad)) return []
    return t.squad.map((p: Record<string, unknown>) => ({
      external_id: String(p.id),
      team_id:     teamId,
      name:        p.name as string,
      position:    (p.position ?? null) as string | null,
    }))
  })

  let playerCount = 0
  if (playerRows.length) {
    const { error: playersErr } = await supabase
      .from("players")
      .upsert(playerRows, { onConflict: "external_id" })
    if (playersErr) throw new Error(`upsert players: ${playersErr.message}`)
    playerCount = playerRows.length
  }

  const matchCount = await syncMatches(teamMap)
  return { teams: teamRows.length, players: playerCount, matches: matchCount }
}

// ── GET: llamado por Vercel Cron / cron-job.org — solo actualiza partidos ──
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!process.env.FOOTBALL_DATA_API_TOKEN) {
    return Response.json({ error: "FOOTBALL_DATA_API_TOKEN no configurada" }, { status: 500 })
  }

  try {
    // Recupera el mapa external_id → uuid desde la BD (sin llamar a la API de equipos)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: teams } = await supabase
      .from("teams")
      .select("id, external_id")
      .not("external_id", "is", null)

    const teamMap: Record<string, string> = Object.fromEntries(
      (teams ?? []).map((t) => [t.external_id!, t.id]),
    )

    const matches = await syncMatches(teamMap)

    revalidateTag("matches", "default")

    // Tras sincronizar, envía las "fotos" de pronósticos que acaban de cerrar.
    // Blindado: un fallo de email NUNCA debe romper el sync.
    let emails: unknown
    try {
      emails = await dispatchDigests()
    } catch (e) {
      emails = { error: (e as Error).message }
    }

    // Recordatorio diario de pronósticos pendientes (idempotente por día).
    let reminders: unknown
    try {
      reminders = await dispatchDailyReminders()
    } catch (e) {
      reminders = { error: (e as Error).message }
    }

    return Response.json({ ok: true, matches, emails, reminders })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

// ── POST: sync completo manual (equipos + partidos) ────────────────────────
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!process.env.FOOTBALL_DATA_API_TOKEN) {
    return Response.json({ error: "FOOTBALL_DATA_API_TOKEN no configurada" }, { status: 500 })
  }

  try {
    const result = await syncFull()
    return Response.json({ ok: true, ...result })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
