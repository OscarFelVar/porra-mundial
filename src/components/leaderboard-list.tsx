"use client"

import { motion } from "motion/react"
import { Crown, Medal } from "lucide-react"
import { Avatar } from "@/components/avatar"

export type LeaderboardRow = {
  rank: number
  user_id: string
  display_name: string | null
  avatar_url: string | null
  total_points: number
  pred_count: number
  exact_count: number
}

const medalColor: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-zinc-300",
  3: "text-amber-600",
}

export function LeaderboardList({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[]
  currentUserId: string
}) {
  // Cuántas filas comparten cada posición → para marcar empates.
  const rankCounts = rows.reduce<Record<number, number>>((acc, r) => {
    acc[r.rank] = (acc[r.rank] ?? 0) + 1
    return acc
  }, {})

  return (
    <ul className="grid gap-2">
      {rows.map((row, i) => {
        const isMe = row.user_id === currentUserId
        const isLeader = row.rank === 1
        // Un empate a 0 puntos (típico antes de jugarse nada) no se marca: es ruido.
        const isTied = rankCounts[row.rank] > 1 && row.total_points > 0

        return (
          <motion.li
            key={row.user_id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 12) * 0.04 }}
            className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border px-5 py-3 backdrop-blur transition ${
              isLeader
                ? "border-yellow-400/30 bg-yellow-400/[0.07]"
                : isMe
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
            }`}
          >
            {isLeader && (
              <span
                aria-hidden
                className="pointer-events-none absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-yellow-400/20 blur-2xl"
              />
            )}

            {/* Posición */}
            <div className="relative z-10 flex w-7 shrink-0 justify-center">
              {isLeader ? (
                <Crown size={20} className="text-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.5)]" />
              ) : row.rank <= 3 ? (
                <Medal size={18} className={medalColor[row.rank]} />
              ) : (
                <span className="text-sm font-bold text-white/30">{row.rank}</span>
              )}
            </div>

            {/* Avatar + nombre */}
            <Avatar src={row.avatar_url} name={row.display_name} size={32} />
            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
              <span className="flex items-baseline gap-1.5 text-sm font-medium text-white">
                <span className="truncate">{row.display_name ?? "Anónimo"}</span>
                {isMe && <span className="shrink-0 text-xs text-white/40">(tú)</span>}
              </span>
              {isTied && (
                <span className="mt-0.5 w-fit rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  empate {row.rank}.º
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="relative z-10 flex items-center gap-3 text-right text-sm">
              <span className="hidden text-white/40 sm:inline">{row.pred_count} pronós.</span>
              {row.exact_count > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-300/80">
                  🎯{row.exact_count}
                </span>
              )}
              <span className="min-w-[3rem] font-[family-name:var(--font-display)] text-xl text-white">
                {row.total_points}
                <span className="ml-0.5 font-sans text-xs text-white/40">pts</span>
              </span>
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}
