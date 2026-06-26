import { createClient } from "@/lib/supabase/server"
import { Reveal } from "@/components/reveal"
import { Bracket, type BracketMatch } from "@/components/bracket"
import { FillableBracket, type R32Match, type Team } from "@/components/fillable-bracket"

const MOCK_NAMES = [
  "España", "Francia", "Brasil", "Argentina", "Alemania", "Inglaterra", "Portugal", "Países Bajos",
  "Italia", "Croacia", "Uruguay", "Bélgica", "México", "EE. UU.", "Japón", "Marruecos",
  "Senegal", "Colombia", "Corea del Sur", "Suiza", "Dinamarca", "Serbia", "Ecuador", "Ghana",
  "Polonia", "Australia", "Canadá", "Camerún", "Túnez", "Gales", "Catar", "Costa Rica",
]

function mockR32(): R32Match[] {
  const teams: Team[] = MOCK_NAMES.map((name, i) => ({ id: `mock-${i}`, name, code: null, crest_url: null }))
  return Array.from({ length: 16 }, (_, i) => ({ slot: i, home: teams[i * 2], away: teams[i * 2 + 1] }))
}

function Heading() {
  return (
    <Reveal>
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
        <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
          Eliminatorias
        </span>
      </h2>
    </Reveal>
  )
}

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>
}) {
  const { demo } = await searchParams
  const isDemo = demo != null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: koMatches } = await supabase
    .from("matches")
    .select(`
      id, phase, kickoff_at, status, home_score_90, away_score_90, advancing_team_id,
      external_id,
      home_team:home_team_id ( id, name, code, crest_url ),
      away_team:away_team_id ( id, name, code, crest_url )
    `)
    .neq("phase", "grupos")
    .order("kickoff_at", { ascending: true })

  // Ordenar dieciseisavos por external_id numérico (asignado por football-data.org
  // al crear el fixture, es estable aunque los equipos se confirmen después).
  // Evita que slots se desplacen cuando se van publicando nuevos cruces.
  const r32Real = (koMatches ?? [])
    .filter((m) => m.phase === "dieciseisavos")
    .sort((a, b) => parseInt(a.external_id ?? "0") - parseInt(b.external_id ?? "0"))
  const firstKickoff = r32Real.length
    ? Math.min(...r32Real.map((m) => new Date(m.kickoff_at).getTime()))
    : null
  const open = firstKickoff != null && new Date().getTime() < firstKickoff - 15 * 60 * 1000

  const { data: picks } = await supabase
    .from("bracket_predictions")
    .select("round, slot, predicted_team_id")
    .eq("user_id", user!.id)
    .is("pool_id", null)

  // Cuadro ABIERTO (dieciseisavos reales, sin empezar) → rellenable real.
  if (open) {
    const matches: R32Match[] = r32Real.map((m, i) => ({
      slot: i,
      home: m.home_team as unknown as Team,
      away: m.away_team as unknown as Team,
    }))
    return (
      <section className="w-full max-w-7xl">
        <Heading />
        <FillableBracket matches={matches} initialPicks={picks ?? []} />
      </section>
    )
  }

  // DEMO (sin datos reales aún) → rellenable de prueba, sin guardar.
  if (isDemo && firstKickoff == null) {
    return (
      <section className="w-full max-w-7xl">
        <Heading />
        <FillableBracket matches={mockR32()} initialPicks={[]} demo />
      </section>
    )
  }

  // Cerrado o sin datos → cuadro de solo lectura (resultados reales / vacío).
  const knockout: BracketMatch[] = (koMatches ?? []).map((m) => ({
    id:                m.id,
    phase:             m.phase,
    kickoff_at:        m.kickoff_at,
    status:            m.status,
    home_score:        m.home_score_90,
    away_score:        m.away_score_90,
    advancing_team_id: m.advancing_team_id,
    home_team:         m.home_team as unknown as BracketMatch["home_team"],
    away_team:         m.away_team as unknown as BracketMatch["away_team"],
  }))

  return (
    <section className="w-full max-w-7xl">
      <Heading />
      <Bracket matches={knockout} />
    </section>
  )
}
