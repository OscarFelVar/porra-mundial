import { createClient } from "@/lib/supabase/server"
import { Reveal } from "@/components/reveal"
import { Bracket, type BracketMatch } from "@/components/bracket"
import { FillableBracket, type R32Match, type Team } from "@/components/fillable-bracket"
import { BracketMyPicks, type MyPick } from "@/components/bracket-my-picks"
import { BracketTabs } from "@/components/bracket-tabs"
import Link from "next/link"
import { Users } from "lucide-react"

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
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Eliminatorias
          </span>
        </h2>
        <Link
          href="/dashboard/bracket/todos"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition hover:text-white"
        >
          <Users size={12} />
          Ver todos
        </Link>
      </div>
    </Reveal>
  )
}

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; preview?: string }>
}) {
  const { demo, preview } = await searchParams
  const isDemo = demo != null
  const forceClose = preview === "closed"

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

  // UUID del equipo placeholder "Por definir"
  const TBD_TEAM_ID = "00000000-0000-0000-0000-000000000001"

  let picks = (picksRaw ?? []) as MyPick[]

  // En modo preview generamos picks ficticios con los equipos reales para
  // poder ver el diseño completo sin esperar a que la gente rellene el cuadro.
  if (forceClose && picks.length === 0) {
    const r32Teams = r32Real
      .map((m) => ({
        home: m.home_team as unknown as Team | null,
        away: m.away_team as unknown as Team | null,
      }))
      .filter((p) => p.home?.id && p.home.id !== TBD_TEAM_ID)

    const mockPicks: MyPick[] = []
    // dieciseisavos: home de cada cruce, mezcla de estados
    for (let s = 0; s < Math.min(16, r32Teams.length); s++) {
      const t = r32Teams[s].home!
      mockPicks.push({
        round: "dieciseisavos", slot: s, predicted_team_id: t.id,
        points_awarded: s < 4 ? 5 : s < 8 ? 0 : null,
      })
    }
    // octavos: home del cruce 0, 2, 4… (cada par de dieciseisavos)
    for (let s = 0; s < 8; s++) {
      const t = r32Teams[Math.min(s * 2, r32Teams.length - 1)].home!
      mockPicks.push({ round: "octavos", slot: s, predicted_team_id: t.id, points_awarded: s < 2 ? 10 : null })
    }
    // cuartos
    for (let s = 0; s < 4; s++) {
      const t = r32Teams[Math.min(s * 4, r32Teams.length - 1)].home!
      mockPicks.push({ round: "cuartos", slot: s, predicted_team_id: t.id, points_awarded: null })
    }
    // semifinal
    for (let s = 0; s < 2; s++) {
      const t = r32Teams[Math.min(s * 8, r32Teams.length - 1)].home!
      mockPicks.push({ round: "semifinal", slot: s, predicted_team_id: t.id, points_awarded: null })
    }
    // final + tercer_puesto
    if (r32Teams[0]) mockPicks.push({ round: "final",         slot: 0, predicted_team_id: r32Teams[0].home!.id, points_awarded: null })
    if (r32Teams[4]) mockPicks.push({ round: "tercer_puesto", slot: 0, predicted_team_id: r32Teams[4].home!.id, points_awarded: null })

    picks = mockPicks
  }

  // Cuadro ABIERTO → rellenable real.
  if (open && !forceClose) {
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
