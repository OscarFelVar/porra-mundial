// Endpoint temporal de diagnóstico — borrar tras el uso
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${process.env.SYNC_SECRET}` && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const fdHeaders = { "X-Auth-Token": process.env.FOOTBALL_DATA_API_TOKEN! }
  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches?season=2026", { headers: fdHeaders })
  if (!res.ok) return Response.json({ error: `football-data: ${res.status}` }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { matches }: { matches: any[] } = await res.json()

  const r32 = matches
    .filter((m) => m.stage === "LAST_32")
    .map((m) => ({
      fd_id:    m.id,
      date:     m.utcDate?.substring(0, 10),
      status:   m.status,
      home_id:  m.homeTeam?.id,
      home:     m.homeTeam?.name ?? "TBD",
      away_id:  m.awayTeam?.id,
      away:     m.awayTeam?.name ?? "TBD",
    }))

  // También mostramos qué tenemos en BD para comparar
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: dbRows } = await supabase
    .from("matches")
    .select("external_id, home_team:home_team_id(name), away_team:away_team_id(name)")
    .eq("phase", "dieciseisavos")
    .order("kickoff_at", { ascending: true })

  const TBD_NAME = "Por definir"
  const db = (dbRows ?? []).map((r) => ({
    fd_id:    r.external_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    home_db:  (r.home_team as any)?.name ?? TBD_NAME,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    away_db:  (r.away_team as any)?.name ?? TBD_NAME,
  }))

  // Cruzamos por external_id para ver diferencias
  const compare = r32.map((fd) => {
    const inDb = db.find((d) => d.fd_id === String(fd.fd_id))
    return {
      fd_id:    fd.fd_id,
      date:     fd.date,
      fd_home:  fd.home,
      fd_away:  fd.away,
      db_home:  inDb?.home_db ?? "(sin fila)",
      db_away:  inDb?.away_db ?? "(sin fila)",
      in_sync:  fd.home === (inDb?.home_db ?? "") && fd.away === (inDb?.away_db ?? ""),
    }
  })

  return Response.json({ total_r32_fd: r32.length, total_r32_db: db.length, compare })
}
