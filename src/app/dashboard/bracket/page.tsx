import { createClient } from "@/lib/supabase/server"
import { Reveal } from "@/components/reveal"
import { Bracket, type BracketMatch } from "@/components/bracket"

export default async function BracketPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      phase,
      kickoff_at,
      status,
      home_score_90,
      away_score_90,
      advancing_team_id,
      home_team:home_team_id ( id, name, code, crest_url ),
      away_team:away_team_id ( id, name, code, crest_url )
    `)
    .neq("phase", "grupos")
    .order("kickoff_at", { ascending: true })

  const knockout: BracketMatch[] = (matches ?? []).map((m) => ({
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
    <section className="w-full max-w-5xl">
      <Reveal>
        <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Eliminatorias
          </span>
        </h2>
      </Reveal>

      <Bracket matches={knockout} />
    </section>
  )
}
