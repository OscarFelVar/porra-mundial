import { createClient } from "@/lib/supabase/server"
import { Reveal } from "@/components/reveal"
import { Bracket, type BracketMatch } from "@/components/bracket"
import { FillableBracket, type R32Match, type Team } from "@/components/fillable-bracket"
import { BracketMyPicks, type MyPick } from "@/components/bracket-my-picks"
import { BracketTabs } from "@/components/bracket-tabs"

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

  const r32Real = (koMatches ?? [])
    .filter((m) => m.phase === "dieciseisavos")
    .sort((a, b) => parseInt(a.external_id ?? "0") - parseInt(b.external_id ?? "0"))
  const firstKickoff = r32Real.length
    ? Math.min(...r32Real.map((m) => new Date(m.kickoff_at).getTime()))
    : null
  const open = firstKickoff != null && new Date().getTime() < firstKickoff - 15 * 60 * 1000

  const { data: picksRaw } = await supabase
    .from("bracket_predictions")
    .select("round, slot, predicted_team_id, points_awarded")
    .eq("user_id", user!.id)
    .is("pool_id", null)

  const picks = (picksRaw ?? []) as MyPick[]

  // UUID del equipo placeholder "Por definir"
  const TBD_TEAM_ID = "00000000-0000-0000-0000-000000000001"

  // Cuadro ABIERTO → rellenable real.
  if (open) {
    const matches: R32Match[] = r32Real.map((m, i) => ({
      slot: i,
      home: m.home_team as unknown as Team,
      away: m.away_team as unknown as Team,
    }))
    return (
      <section className="w-full max-w-7xl">
        <Heading />
        <FillableBracket matches={matches} initialPicks={picks} tbdTeamId={TBD_TEAM_ID} />
      </section>
    )
  }

  // DEMO → rellenable de prueba.
  if (isDemo && firstKickoff == null) {
    return (
      <section className="w-full max-w-7xl">
        <Heading />
        <FillableBracket matches={mockR32()} initialPicks={[]} demo />
      </section>
    )
  }

  // CERRADO → cuadro real + mis picks con puntos.
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

  // Todos los equipos de los partidos KO para mostrar escudos en "Mis picks"
  const teamsMap = new Map<string, Team>()
  for (const m of koMatches ?? []) {
    const home = m.home_team as unknown as Team | null
    const away = m.away_team as unknown as Team | null
    if (home?.id && home.id !== TBD_TEAM_ID) teamsMap.set(home.id, home)
    if (away?.id && away.id !== TBD_TEAM_ID) teamsMap.set(away.id, away)
  }
  const teams = [...teamsMap.values()]

  return (
    <section className="w-full max-w-7xl">
      <Heading />
      <BracketTabs
        hasPicks={picks.length > 0}
        real={<Bracket matches={knockout} />}
        myPicks={<BracketMyPicks picks={picks} teams={teams} />}
      />
    </section>
  )
}
