"use client"

import { motion } from "motion/react"
import { X, Clock } from "lucide-react"

export type MyPick = {
  round: string
  slot: number
  predicted_team_id: string
  points_awarded: number | null
}

type Team = { id: string; name: string; code: string | null; crest_url: string | null }

const ROUNDS = [
  { key: "dieciseisavos", label: "16avos",  slots: 16 },
  { key: "octavos",       label: "Octavos", slots: 8 },
  { key: "cuartos",       label: "Cuartos", slots: 4 },
  { key: "semifinal",     label: "Semis",   slots: 2 },
  { key: "final",         label: "Final",   slots: 1 },
]

function PickSlot({ pick, team }: { pick: MyPick | undefined; team: Team | undefined }) {
  if (!pick) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/5" />
          <span className="min-w-0 flex-1 truncate text-xs text-white/20">—</span>
        </div>
      </div>
    )
  }

  const pts = pick.points_awarded
  const decided = pts !== null && pts !== undefined
  const correct = decided && pts! > 0
  const wrong = decided && pts === 0

  return (
    <div
      className={`overflow-hidden rounded-xl border backdrop-blur ${
        correct
          ? "border-emerald-400/30 bg-emerald-400/[0.07]"
          : wrong
            ? "border-red-400/20 bg-red-400/[0.04]"
            : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {team?.crest_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.crest_url} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" />
        ) : (
          <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/10" />
        )}
        <span className={`min-w-0 flex-1 truncate text-xs ${
          correct ? "font-semibold text-emerald-300"
          : wrong  ? "text-white/35 line-through"
          : team   ? "text-white/80"
          : "text-white/25"
        }`}>
          {team?.name ?? "—"}
        </span>
        {correct && (
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-emerald-300">
            +{pts}
          </span>
        )}
        {wrong   && <X    size={11} className="shrink-0 text-red-400/50" />}
        {!decided && pick && <Clock size={11} className="shrink-0 text-white/20" />}
      </div>
    </div>
  )
}

export function BracketMyPicks({
  picks,
  teams,
}: {
  picks: MyPick[]
  teams: Team[]
}) {
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const pickMap = new Map(picks.map((p) => [`${p.round}:${p.slot}`, p]))

  const totalPts  = picks.reduce((s, p) => s + (p.points_awarded ?? 0), 0)
  const correct   = picks.filter((p) => p.points_awarded !== null && p.points_awarded! > 0).length
  const decided   = picks.filter((p) => p.points_awarded !== null).length

  const thirdPick = pickMap.get("tercer_puesto:0")
  const thirdTeam = thirdPick ? teamMap.get(thirdPick.predicted_team_id) : undefined

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-white/40">
          {correct}/{decided} acertadas
        </p>
        <span className="font-[family-name:var(--font-display)] text-xl text-emerald-300">
          +{totalPts}
          <span className="ml-0.5 font-sans text-xs text-white/40">pts bracket</span>
        </span>
      </div>

      <div className="-mx-6 overflow-x-auto px-6 pb-4">
        <div className="flex min-w-max items-stretch gap-3">
          {ROUNDS.map((round, ri) => (
            <motion.div
              key={round.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: ri * 0.05 }}
              className="flex w-[12rem] shrink-0 flex-col"
            >
              <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                {round.label}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {Array.from({ length: round.slots }).map((_, s) => {
                  const pick = pickMap.get(`${round.key}:${s}`)
                  const team = pick ? teamMap.get(pick.predicted_team_id) : undefined
                  return <PickSlot key={s} pick={pick} team={team} />
                })}
              </div>
            </motion.div>
          ))}

          {/* Tercer puesto */}
          <div className="flex w-[12rem] shrink-0 flex-col justify-end">
            <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/50">
              3.er puesto
            </h3>
            <PickSlot pick={thirdPick} team={thirdTeam} />
          </div>
        </div>
      </div>
    </div>
  )
}
