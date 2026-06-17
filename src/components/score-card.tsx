import { Trophy } from "lucide-react"

export function ScoreCard({
  rank,
  totalPoints,
  predCount,
  poolName,
}: {
  rank: number
  totalPoints: number
  predCount: number
  poolName: string
}) {
  return (
    <div className="mb-6 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Trophy size={13} className="text-emerald-400" />
          <span>Tu posición</span>
        </div>
        <span className="text-xs text-white/25">{poolName}</span>
      </div>
      <div className="flex items-end gap-8">
        <div>
          <p className="font-[family-name:var(--font-display)] text-4xl bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent leading-none">
            #{rank}
          </p>
          <p className="mt-1 text-[11px] text-white/35">posición</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl text-white leading-none">
            {totalPoints}
          </p>
          <p className="mt-1 text-[11px] text-white/35">puntos</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl text-white/50 leading-none">
            {predCount}
          </p>
          <p className="mt-1 text-[11px] text-white/35">pronósticos</p>
        </div>
      </div>
    </div>
  )
}
