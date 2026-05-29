import { createClient } from "@supabase/supabase-js"

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

  const rows = fdMatches
    .filter((m) => teamMap[String(m.homeTeam.id)] && teamMap[String(m.awayTeam.id)])
    .map((m) => ({
      external_id:   String(m.id),
      phase:         PHASE_MAP[m.stage] ?? "grupos",
      group_label:   m.group ? (m.group as string).replace("GROUP_", "") : null,
      home_team_id:  teamMap[String(m.homeTeam.id)],
      away_team_id:  teamMap[String(m.awayTeam.id)],
      kickoff_at:    m.utcDate as string,
      status:        STATUS_MAP[m.status] ?? "scheduled",
      home_score_90: (m.score?.fullTime?.home ?? null) as number | null,
      away_score_90: (m.score?.fullTime?.away ?? null) as number | null,
    }))

  const { error } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "external_id" })

  if (error) throw new Error(`upsert matches: ${error.message}`)
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

  const matchCount = await syncMatches(teamMap)
  return { teams: teamRows.length, matches: matchCount }
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
    return Response.json({ ok: true, matches })
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
