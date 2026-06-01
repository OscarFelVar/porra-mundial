import { createClient } from "@/lib/supabase/server"
import { MatchCard, type MatchData } from "@/components/match-card"

export default async function PronosticosPage() {
  const supabase = await createClient()

  // getUser y la consulta de partidos no dependen entre sí: en paralelo.
  const [
    {
      data: { user },
    },
    { data: matches },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("matches")
      .select(`
        id,
        phase,
        group_label,
        kickoff_at,
        status,
        home_team:home_team_id ( id, name, code, crest_url ),
        away_team:away_team_id ( id, name, code, crest_url )
      `)
      .order("kickoff_at", { ascending: true }),
  ])

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score")
    .eq("user_id", user!.id)
    .is("pool_id", null)

  const predByMatch = Object.fromEntries(
    (predictions ?? []).map((p) => [p.match_id, p]),
  )

  const now = new Date()

  const matchData: MatchData[] = (matches ?? []).map((m) => ({
    id:           m.id,
    phase:        m.phase,
    group_label:  m.group_label,
    kickoff_at:   m.kickoff_at,
    home_team:    m.home_team as unknown as MatchData["home_team"],
    away_team:    m.away_team as unknown as MatchData["away_team"],
    prediction:   predByMatch[m.id] ?? null,
    locked:       new Date(m.kickoff_at) <= now,
  }))

  if (matchData.length === 0) {
    return (
      <section className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center text-white/40">
        <span className="text-4xl">⚽</span>
        <p className="mt-3 text-sm">Aún no hay partidos cargados</p>
        <p className="mt-1 text-xs">Ejecuta la migración SQL en Supabase para añadir datos de prueba</p>
      </section>
    )
  }

  return (
    <section className="w-full max-w-2xl">
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-white">
        Pronósticos
      </h2>
      <ul className="grid gap-3">
        {matchData.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </ul>
    </section>
  )
}
