"use client"

import { motion } from "motion/react"

type Team = { id: string; name: string; code: string | null; crest_url: string | null }

export type BracketMatch = {
  id: string
  phase: string
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  advancing_team_id: string | null
  home_team: Team | null
  away_team: Team | null
}

function fmtKickoff(iso: string): string {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", timeZone: "Europe/Madrid",
  }).format(d)
  const time = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
  }).format(d)
  return `${date} · ${time}`
}

// Orden de rondas (tercer_puesto se muestra junto a la final)
const ROUNDS: { key: string; label: string }[] = [
  { key: "dieciseisavos", label: "Dieciseisavos" },
  { key: "octavos",       label: "Octavos" },
  { key: "cuartos",       label: "Cuartos" },
  { key: "semifinal",     label: "Semifinal" },
  { key: "final",         label: "Final" },
]

function winnerId(m: BracketMatch): string | null {
  if (m.advancing_team_id) return m.advancing_team_id
  if (m.status === "finished" && m.home_score != null && m.away_score != null) {
    if (m.home_score > m.away_score) return m.home_team?.id ?? null
    if (m.away_score > m.home_score) return m.away_team?.id ?? null
  }
  return null
}

function TeamRow({
  team,
  score,
  isWinner,
  decided,
}: {
  team: Team | null
  score: number | null
  isWinner: boolean
  decided: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 ${
        decided && !isWinner ? "opacity-45" : ""
      }`}
    >
      {team?.crest_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crest_url} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" />
      ) : (
        <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/10" />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-xs ${
          isWinner ? "font-semibold text-emerald-300" : "text-white/80"
        }`}
      >
        {team?.name ?? "Por definir"}
      </span>
      <span
        className={`w-4 text-right font-[family-name:var(--font-display)] text-sm ${
          isWinner ? "text-emerald-300" : "text-white/60"
        }`}
      >
        {score ?? "–"}
      </span>
    </div>
  )
}

function MatchNode({ match, dim = false }: { match: BracketMatch; dim?: boolean }) {
  const w = winnerId(match)
  const decided = w != null
  return (
    <div
      className={`overflow-hidden rounded-xl border backdrop-blur ${
        dim
          ? "border-white/5 bg-white/[0.03]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="border-b border-white/5 px-3 py-1 text-[10px] text-white/30">
        {fmtKickoff(match.kickoff_at)}
      </div>
      <TeamRow team={match.home_team} score={match.home_score} isWinner={w === match.home_team?.id} decided={decided} />
      <div className="h-px bg-white/10" />
      <TeamRow team={match.away_team} score={match.away_score} isWinner={w === match.away_team?.id} decided={decided} />
    </div>
  )
}

function RoundColumn({
  label,
  matches,
  index,
}: {
  label: string
  matches: BracketMatch[]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
      className="flex w-[12rem] shrink-0 flex-col"
    >
      <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </h3>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map((m) => (
          <MatchNode key={m.id} match={m} />
        ))}
      </div>
    </motion.div>
  )
}

export function Bracket({ matches }: { matches: BracketMatch[] }) {
  const byPhase = (phase: string) =>
    matches
      .filter((m) => m.phase === phase)
      .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))

  const thirdPlace = byPhase("tercer_puesto")
  const hasAny = matches.length > 0

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-20 text-center text-white/40 backdrop-blur">
        <span className="text-4xl">🏆</span>
        <p className="mt-3 text-sm">Las eliminatorias se desbloquean al terminar la fase de grupos</p>
        <p className="mt-1 text-xs">El cuadro se irá rellenando con los cruces reales</p>
      </div>
    )
  }

  // Solo mostramos las rondas que ya tienen partidos (se llenan progresivamente)
  const activeRounds = ROUNDS.filter((r) => byPhase(r.key).length > 0)

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-4">
      <div className="flex min-w-max items-stretch gap-3">
        {activeRounds.map((r, i) => (
          <RoundColumn key={r.key} label={r.label} matches={byPhase(r.key)} index={i} />
        ))}

        {thirdPlace.length > 0 && (
          <div className="flex w-[12rem] shrink-0 flex-col justify-end">
            <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/50">
              3.er puesto
            </h3>
            {thirdPlace.map((m) => (
              <MatchNode key={m.id} match={m} dim />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
