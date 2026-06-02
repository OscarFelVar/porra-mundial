import { createClient } from "@/lib/supabase/server"
import { SpecialBetsForm, type Player } from "@/components/special-bets-form"
import { Reveal } from "@/components/reveal"

export default async function ApuestasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: betData }, { data: settings }, { data: playersData }] = await Promise.all([
    supabase
      .from("special_bets")
      .select("top_scorer, mvp, best_goalkeeper")
      .eq("user_id", user!.id)
      .is("pool_id", null)
      .maybeSingle(),
    supabase
      .from("app_settings")
      .select("special_bets_deadline")
      .eq("id", 1)
      .single(),
    supabase
      .from("players")
      .select("name, position, team:teams ( code )")
      .order("name", { ascending: true }),
  ])

  const players: Player[] = (playersData ?? []).map((p) => ({
    name:     p.name as string,
    position: (p.position ?? null) as string | null,
    team:     (p.team as unknown as { code: string | null } | null)?.code ?? null,
  }))

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
          Predice el máximo goleador, el MVP y el mejor portero del Mundial. Solo puedes cambiarlo antes del primer partido.
        </p>
      </Reveal>
      <SpecialBetsForm
        existing={betData ?? null}
        deadline={deadline}
        closed={closed}
        players={players}
      />
    </section>
  )
}
