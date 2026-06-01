import { createClient } from "@/lib/supabase/server"
import { PoolSelector } from "@/components/pool-selector"
import { Avatar } from "@/components/avatar"
import { Medal } from "lucide-react"

type Row = {
  rank: number
  user_id: string
  display_name: string | null
  avatar_url: string | null
  total_points: number
  pred_count: number
}

const medalColors: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-zinc-300",
  3: "text-amber-600",
}

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
      <section className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center text-white/40">
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

  const leaderboard: Row[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    rank:         Number(r.rank),
    user_id:      r.user_id as string,
    display_name: r.display_name as string | null,
    avatar_url:   r.avatar_url as string | null,
    total_points: Number(r.total_points),
    pred_count:   Number(r.pred_count),
  }))

  return (
    <section className="w-full max-w-2xl">
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-white">
        Tabla
      </h2>

      <PoolSelector pools={pools} selected={selectedId} />

      {error ? (
        <p className="text-sm text-red-400">{error.message}</p>
      ) : leaderboard.length === 0 ? (
        <p className="text-sm text-white/40">No hay miembros en este grupo aún.</p>
      ) : (
        <ul className="grid gap-2">
          {leaderboard.map((row) => (
            <li
              key={row.user_id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-3 ${
                row.user_id === user!.id
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {/* Posición */}
              <div className="w-7 shrink-0 text-center">
                {row.rank <= 3 ? (
                  <Medal size={18} className={medalColors[row.rank]} />
                ) : (
                  <span className="text-sm font-bold text-white/30">{row.rank}</span>
                )}
              </div>

              {/* Avatar + nombre */}
              <Avatar src={row.avatar_url} name={row.display_name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                {row.display_name ?? "Anónimo"}
                {row.user_id === user!.id && (
                  <span className="ml-2 text-xs text-white/40">(tú)</span>
                )}
              </span>

              {/* Stats */}
              <div className="flex items-center gap-4 text-right text-sm">
                <span className="text-white/40">{row.pred_count} pronós.</span>
                <span className="min-w-[3rem] font-[family-name:var(--font-display)] text-xl text-white">
                  {row.total_points}
                  <span className="ml-0.5 text-xs font-sans text-white/40">pts</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
