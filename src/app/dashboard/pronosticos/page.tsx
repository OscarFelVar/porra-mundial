import { createClient } from "@/lib/supabase/server"
import { MatchCard, type MatchData, type OtherPred } from "@/components/match-card"
import { Reveal } from "@/components/reveal"

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
        home_score_90,
        away_score_90,
        home_team:home_team_id ( id, name, code, crest_url ),
        away_team:away_team_id ( id, name, code, crest_url )
      `)
      .order("kickoff_at", { ascending: true }),
  ])

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, points_awarded")
    .eq("user_id", user!.id)
    .is("pool_id", null)

  const predByMatch = Object.fromEntries(
    (predictions ?? []).map((p) => [p.match_id, p]),
  )

  const nowMs = new Date().getTime()
  const LOCK_MS = 15 * 60 * 1000 // se cierra 15 min antes del kickoff

  const matchData: MatchData[] = (matches ?? []).map((m) => {
    const pred = predByMatch[m.id] ?? null
    const finished =
      m.status === "finished" && m.home_score_90 != null && m.away_score_90 != null
    return {
      id:           m.id,
      phase:        m.phase,
      group_label:  m.group_label,
      kickoff_at:   m.kickoff_at,
      home_team:    m.home_team as unknown as MatchData["home_team"],
      away_team:    m.away_team as unknown as MatchData["away_team"],
      prediction:   pred ? { home_score: pred.home_score, away_score: pred.away_score } : null,
      locked:       new Date(m.kickoff_at).getTime() - LOCK_MS <= nowMs,
      finished,
      result:       finished ? { home: m.home_score_90 ?? 0, away: m.away_score_90 ?? 0 } : null,
      points:       pred?.points_awarded ?? null,
    }
  })

  // Pronósticos de TODOS: solo en partidos ya cerrados (la RLS de predictions
  // únicamente devuelve los ajenos cuando now >= kickoff − 15 min y se comparte grupo).
  const lockedIds = matchData.filter((m) => m.locked).map((m) => m.id)
  const othersByMatch: Record<string, OtherPred[]> = {}
  if (lockedIds.length > 0) {
    const { data: allPreds } = await supabase
      .from("predictions")
      .select("match_id, user_id, home_score, away_score, points_awarded, profile:user_id ( display_name )")
      .is("pool_id", null)
      .in("match_id", lockedIds)
      .range(0, 9999)
    for (const p of allPreds ?? []) {
      const name = (p.profile as unknown as { display_name: string | null } | null)?.display_name ?? "Anónimo"
      ;(othersByMatch[p.match_id as string] ??= []).push({
        user_id: p.user_id as string,
        name,
        home:    p.home_score as number,
        away:    p.away_score as number,
        points:  (p.points_awarded ?? null) as number | null,
      })
    }
    // Orden: partidos finalizados por puntos desc; el resto, alfabético.
    for (const id of Object.keys(othersByMatch)) {
      const finished = matchData.find((m) => m.id === id)?.finished
      othersByMatch[id].sort((a, b) =>
        finished
          ? (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      )
    }
  }

  if (matchData.length === 0) {
    return (
      <section className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-20 text-center text-white/40 backdrop-blur">
        <span className="text-4xl">⚽</span>
        <p className="mt-3 text-sm">Aún no hay partidos cargados</p>
        <p className="mt-1 text-xs">Ejecuta la migración SQL en Supabase para añadir datos de prueba</p>
      </section>
    )
  }

  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Pronósticos
          </span>
        </h2>
      </Reveal>
      <ul className="grid gap-3">
        {matchData.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            others={othersByMatch[m.id] ?? []}
            currentUserId={user?.id}
          />
        ))}
      </ul>
    </section>
  )
}
