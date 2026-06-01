import { createClient } from "@/lib/supabase/server"
import { SpecialBetsForm, type Team } from "@/components/special-bets-form"
import { Reveal } from "@/components/reveal"

export default async function ApuestasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: teamsData }, { data: betData }, { data: settings }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, code, crest_url")
      .order("name", { ascending: true }),
    supabase
      .from("special_bets")
      .select("champion_team_id, runnerup_team_id, top_scorer")
      .eq("user_id", user!.id)
      .is("pool_id", null)
      .maybeSingle(),
    supabase
      .from("app_settings")
      .select("special_bets_deadline")
      .eq("id", 1)
      .single(),
  ])

  const teams: Team[] = (teamsData ?? []) as Team[]
  const deadline = settings?.special_bets_deadline ?? null
  const closed = deadline ? new Date() >= new Date(deadline) : false

  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Apuestas especiales
          </span>
        </h2>
        <p className="mb-5 text-sm text-white/40">
          Predice el campeón, subcampeón y máximo goleador del Mundial. Solo puedes cambiarlo antes del primer partido.
        </p>
      </Reveal>
      <SpecialBetsForm
        teams={teams}
        existing={betData ?? null}
        deadline={deadline}
        closed={closed}
      />
    </section>
  )
}
