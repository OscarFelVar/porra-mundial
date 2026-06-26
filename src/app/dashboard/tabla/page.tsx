import { createClient } from "@/lib/supabase/server"
import { PoolSelector } from "@/components/pool-selector"
import { Reveal } from "@/components/reveal"
import { LeaderboardList, type LeaderboardRow } from "@/components/leaderboard-list"

export default async function TablaPage({
  searchParams,
}: {
  searchParams: Promise<{ pool?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { pool: poolParam } = await searchParams

  // Pools del usuario
  const { data: memberRows } = await supabase
    .from("pool_members")
    .select("pool:pools(id, name)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: true })

  const pools = (memberRows ?? [])
    .filter((r) => r.pool !== null)
    .map((r) => r.pool as unknown as { id: string; name: string })

  if (pools.length === 0) {
    return (
      <section className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-20 text-center text-white/40 backdrop-blur">
        <span className="text-4xl">📊</span>
        <p className="mt-3 text-sm">Únete a un grupo para ver la tabla</p>
      </section>
    )
  }

  const selectedId = poolParam && pools.find((p) => p.id === poolParam)
    ? poolParam
    : pools[0].id

  const { data: rows, error } = await supabase.rpc("pool_leaderboard", {
    p_pool_id: selectedId,
  })

  const leaderboard: LeaderboardRow[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    rank:         Number(r.rank),
    user_id:      r.user_id as string,
    display_name: r.display_name as string | null,
    avatar_url:   r.avatar_url as string | null,
    total_points: Number(r.total_points),
    pred_count:   Number(r.pred_count),
    exact_count:  Number(r.exact_count ?? 0),
  }))

  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Tabla
          </span>
        </h2>
      </Reveal>

      <PoolSelector pools={pools} selected={selectedId} />

      {error ? (
        <p className="text-sm text-red-400">{error.message}</p>
      ) : leaderboard.length === 0 ? (
        <p className="text-sm text-white/40">No hay miembros en este grupo aún.</p>
      ) : (
        <LeaderboardList rows={leaderboard} currentUserId={user!.id} />
      )}
    </section>
  )
}
