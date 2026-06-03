import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Reveal } from "@/components/reveal"
import { type Player } from "@/components/player-autocomplete"
import { AdminSpecials } from "@/components/admin/admin-specials"
import { AdminMatches, type AdminMatch } from "@/components/admin/admin-matches"
import { AdminDigest, type PoolOption } from "@/components/admin/admin-digest"

type TeamRef = { id: string; name: string; code: string | null } | null

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) redirect("/dashboard")

  const [{ data: settings }, { data: playersData }, { data: matchesData }, { data: poolsData }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("special_bets_deadline, result_top_scorer, result_mvp, result_best_goalkeeper, digest_pool_id")
      .eq("id", 1)
      .single(),
    supabase
      .from("players")
      .select("name, position, team:teams ( code )")
      .order("name", { ascending: true }),
    supabase
      .from("matches")
      .select(`
        id, phase, group_label, kickoff_at, status,
        home_score_90, away_score_90, advancing_team_id,
        home:home_team_id ( id, name, code ),
        away:away_team_id ( id, name, code )
      `)
      .order("kickoff_at", { ascending: true }),
    supabase
      .from("pools")
      .select("id, name")
      .order("created_at", { ascending: true }),
  ])

  const pools: PoolOption[] = (poolsData ?? []).map((p) => ({
    id:   p.id as string,
    name: p.name as string,
  }))

  const players: Player[] = (playersData ?? []).map((p) => ({
    name:     p.name as string,
    position: (p.position ?? null) as string | null,
    team:     (p.team as unknown as { code: string | null } | null)?.code ?? null,
  }))

  const matches: AdminMatch[] = (matchesData ?? []).map((m) => {
    const home = m.home as unknown as TeamRef
    const away = m.away as unknown as TeamRef
    return {
      id:              m.id as string,
      phase:           m.phase as string,
      groupLabel:      (m.group_label ?? null) as string | null,
      kickoffAt:       m.kickoff_at as string,
      status:          m.status as "scheduled" | "live" | "finished",
      homeScore:       (m.home_score_90 ?? null) as number | null,
      awayScore:       (m.away_score_90 ?? null) as number | null,
      advancingTeamId: (m.advancing_team_id ?? null) as string | null,
      home:            home ? { id: home.id, name: home.name, code: home.code } : null,
      away:            away ? { id: away.id, name: away.name, code: away.code } : null,
    }
  })

  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-rose-300 bg-clip-text text-transparent">
            Panel de admin
          </span>
        </h2>
        <p className="mb-6 text-sm text-white/40">
          Fija los resultados de las apuestas especiales y su fecha límite, corrige
          marcadores y marca quién avanza en las eliminatorias. Los puntos se recalculan solos.
        </p>
      </Reveal>

      <div className="grid gap-8">
        <AdminSpecials
          players={players}
          deadline={settings?.special_bets_deadline ?? null}
          results={{
            top_scorer:      settings?.result_top_scorer ?? null,
            mvp:             settings?.result_mvp ?? null,
            best_goalkeeper: settings?.result_best_goalkeeper ?? null,
          }}
        />
        <AdminMatches matches={matches} />
        <AdminDigest pools={pools} current={settings?.digest_pool_id ?? null} />
      </div>
    </section>
  )
}
