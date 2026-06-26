import { createClient } from "@/lib/supabase/server"
import { Reveal } from "@/components/reveal"
import { Avatar } from "@/components/avatar"
import { Crown } from "lucide-react"
import Link from "next/link"

type Team = { id: string; name: string; crest_url: string | null }

export default async function BracketTodosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Solo mostrar cuando el bracket ya cerró (1er partido de dieciseisavos empezó)
  const { data: r32 } = await supabase
    .from("matches")
    .select("kickoff_at")
    .eq("phase", "dieciseisavos")
    .order("kickoff_at", { ascending: true })
    .limit(1)
  const firstKickoff = r32?.[0]?.kickoff_at
    ? new Date(r32[0].kickoff_at).getTime()
    : null
  const closed = firstKickoff != null && Date.now() >= firstKickoff - 15 * 60 * 1000

  if (!closed) {
    return (
      <section className="w-full max-w-2xl">
        <Reveal>
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
            <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
              Cuadros de todos
            </span>
          </h2>
        </Reveal>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-16 text-center text-white/40 backdrop-blur">
          <span className="text-4xl">🔒</span>
          <p className="mt-3 text-sm">Los cuadros se revelan cuando empiece el torneo</p>
        </div>
        <Link href="/dashboard/bracket" className="mt-4 inline-block text-xs text-white/40 hover:text-white">
          ← Volver al bracket
        </Link>
      </section>
    )
  }

  // Pools del usuario para buscar compañeros
  const { data: memberRows } = await supabase
    .from("pool_members")
    .select("pool_id")
    .eq("user_id", user!.id)
  const poolIds = (memberRows ?? []).map((r) => r.pool_id as string)

  if (poolIds.length === 0) {
    return (
      <section className="w-full max-w-2xl">
        <p className="text-sm text-white/40">No estás en ningún grupo.</p>
      </section>
    )
  }

  // Compañeros de mis grupos (deduplicados)
  const { data: companions } = await supabase
    .from("pool_members")
    .select("user_id, profile:profiles!inner ( display_name, avatar_url )")
    .in("pool_id", poolIds)
  const usersMap = new Map<string, { display_name: string | null; avatar_url: string | null }>()
  for (const r of companions ?? []) {
    const p = r.profile as unknown as { display_name: string | null; avatar_url: string | null }
    if (!usersMap.has(r.user_id as string)) usersMap.set(r.user_id as string, p)
  }
  const userIds = [...usersMap.keys()]

  // Equipos para nombres y escudos
  const { data: teamsRaw } = await supabase.from("teams").select("id, name, crest_url")
  const teamMap = new Map<string, Team>(
    (teamsRaw ?? []).map((t) => [t.id as string, t as Team])
  )

  // Picks de bracket de todos los compañeros
  const { data: bpRaw } = await supabase
    .from("bracket_predictions")
    .select("user_id, round, slot, predicted_team_id, points_awarded")
    .is("pool_id", null)
    .in("user_id", userIds)

  type BPRow = { user_id: string; round: string; slot: number; predicted_team_id: string; points_awarded: number | null }
  const byUser = new Map<string, BPRow[]>()
  for (const p of (bpRaw ?? []) as BPRow[]) {
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, [])
    byUser.get(p.user_id)!.push(p)
  }

  // Ordenar: primero el usuario actual, luego por bracket_pts desc
  const rows = [...usersMap.entries()]
    .map(([uid, profile]) => {
      const userPicks = byUser.get(uid) ?? []
      const champion = userPicks.find((p) => p.round === "final" && p.slot === 0)
      const semis = userPicks.filter((p) => p.round === "semifinal").map((p) => teamMap.get(p.predicted_team_id))
      const bracketPts = userPicks.reduce((s, p) => s + (p.points_awarded ?? 0), 0)
      const filledCount = userPicks.length
      return { uid, profile, champion, semis, bracketPts, filledCount }
    })
    .sort((a, b) => {
      if (a.uid === user!.id) return -1
      if (b.uid === user!.id) return 1
      return b.bracketPts - a.bracketPts
    })

  const TBD_TEAM_ID = "00000000-0000-0000-0000-000000000001"

  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-1 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Cuadros de todos
          </span>
        </h2>
      </Reveal>
      <p className="mb-6 text-sm text-white/40">{rows.filter((r) => r.filledCount > 0).length} participantes rellenaron el cuadro</p>

      <ul className="grid gap-3">
        {rows.map(({ uid, profile, champion, semis, bracketPts, filledCount }) => {
          const isMe = uid === user!.id
          const champTeam = champion ? teamMap.get(champion.predicted_team_id) : null
          const hasValidChamp = champTeam && champTeam.id !== TBD_TEAM_ID

          return (
            <li
              key={uid}
              className={`rounded-2xl border px-5 py-4 backdrop-blur ${
                isMe ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar src={profile.avatar_url} name={profile.display_name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-medium text-white">
                      {profile.display_name ?? "Anónimo"}
                    </span>
                    {isMe && <span className="text-xs text-white/40">(tú)</span>}
                  </div>
                  {filledCount === 0 ? (
                    <span className="text-xs text-white/30">No rellenó el cuadro</span>
                  ) : semis.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {semis.map((t, i) => t && t.id !== TBD_TEAM_ID && (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-white/60">
                          {t.crest_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.crest_url} alt="" width={12} height={12} className="h-3 w-3 object-contain" />
                          )}
                          {t.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {hasValidChamp && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-yellow-400/10 px-2 py-1">
                      <Crown size={11} className="text-yellow-400" />
                      <span className="text-xs font-semibold text-yellow-300">
                        {champTeam!.name}
                      </span>
                    </div>
                  )}
                  {bracketPts > 0 && (
                    <span className="font-[family-name:var(--font-display)] text-lg text-emerald-300">
                      +{bracketPts}
                      <span className="ml-0.5 font-sans text-[10px] text-white/40">pts</span>
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <Link href="/dashboard/bracket" className="mt-6 inline-block text-xs text-white/40 hover:text-white">
        ← Volver al bracket
      </Link>
    </section>
  )
}
