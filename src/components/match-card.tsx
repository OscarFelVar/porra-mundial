"use client"

import { useState, useTransition } from "react"
import { motion } from "motion/react"
import { Check, Lock, Loader2, Users, ChevronDown } from "lucide-react"
import { upsertPrediction } from "@/app/dashboard/pronosticos/actions"
import { LocalTime } from "@/components/local-time"

const KICKOFF_FMT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
}

export type MatchData = {
  id: string
  phase: string
  group_label: string | null
  kickoff_at: string
  home_team: { id: string; name: string; code: string | null; crest_url: string | null } | null
  away_team: { id: string; name: string; code: string | null; crest_url: string | null } | null
  prediction: { home_score: number; away_score: number } | null
  locked: boolean
  finished: boolean
  result: { home: number; away: number } | null
  points: number | null
}

// Pronóstico de otro participante (visible solo cuando el partido se cierra).
export type OtherPred = {
  user_id: string
  name: string
  home: number
  away: number
  points: number | null
}

function PointsBadge({ points }: { points: number | null }) {
  if (points == null) return null
  const positive = points > 0
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
        positive ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-white/40"
      }`}
    >
      {positive ? `+${points}` : "0"} pts
    </span>
  )
}

const PHASE_NAMES: Record<string, string> = {
  dieciseisavos: "Dieciseisavos",
  octavos:       "Octavos",
  cuartos:       "Cuartos",
  semifinal:     "Semifinal",
  tercer_puesto: "3.er puesto",
  final:         "Final",
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-12 rounded-xl border border-white/10 bg-white/5 py-2 text-center text-lg font-bold text-white outline-none transition focus:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
}

function TeamCrest({
  team,
}: {
  team: MatchData["home_team"]
}) {
  if (team?.crest_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crest_url}
        alt={team.name}
        width={36}
        height={36}
        className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      />
    )
  }
  return <div className="h-9 w-9 rounded-full bg-white/10" />
}


export function MatchCard({
  match,
  others = [],
  currentUserId,
}: {
  match: MatchData
  others?: OtherPred[]
  currentUserId?: string
}) {
  const [home, setHome] = useState(match.prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(match.prediction?.away_score?.toString() ?? "")
  const [saved, setSaved] = useState(!!match.prediction)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)

  const dirty =
    home !== (match.prediction?.home_score?.toString() ?? "") ||
    away !== (match.prediction?.away_score?.toString() ?? "")

  function handleSave() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError("Introduce un resultado válido")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await upsertPrediction(match.id, h, a)
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const isGroup = !!match.group_label
  const phaseLabel = isGroup
    ? `Grupo ${match.group_label}`
    : PHASE_NAMES[match.phase] ?? match.phase

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border px-5 py-4 backdrop-blur transition ${
        match.locked
          ? "border-white/5 bg-white/[0.03]"
          : "border-white/10 bg-white/5 hover:bg-white/[0.06]"
      }`}
    >
      {/* Meta */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isGroup
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-cyan-400/10 text-cyan-300"
          }`}
        >
          {phaseLabel}
        </span>
        <LocalTime iso={match.kickoff_at} options={KICKOFF_FMT} className="text-xs text-white/40" />
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <TeamCrest team={match.home_team} />
          <span className="truncate text-xs font-medium text-white/80">
            {match.home_team?.name ?? "—"}
          </span>
        </div>

        {/* Scores */}
        {match.finished && match.result ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-white">
              <span className="min-w-[2rem] text-center">{match.result.home}</span>
              <span className="text-white/25">:</span>
              <span className="min-w-[2rem] text-center">{match.result.away}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/30">Final</span>
          </div>
        ) : match.locked ? (
          <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-white">
            <span className="min-w-[2rem] text-center">
              {match.prediction?.home_score ?? "–"}
            </span>
            <span className="text-white/25">:</span>
            <span className="min-w-[2rem] text-center">
              {match.prediction?.away_score ?? "–"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ScoreInput value={home} onChange={(v) => { setHome(v); setSaved(false) }} disabled={false} />
            <span className="text-white/30">:</span>
            <ScoreInput value={away} onChange={(v) => { setAway(v); setSaved(false) }} disabled={false} />
          </div>
        )}

        {/* Away */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <TeamCrest team={match.away_team} />
          <span className="truncate text-xs font-medium text-white/80">
            {match.away_team?.name ?? "—"}
          </span>
        </div>
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center justify-end gap-2">
        {error && <p className="text-xs text-red-400">{error}</p>}

        {match.finished ? (
          <>
            {match.prediction ? (
              <span className="text-xs text-white/40">
                Tu pronóstico {match.prediction.home_score}–{match.prediction.away_score}
              </span>
            ) : (
              <span className="text-xs text-white/30">No pronosticaste</span>
            )}
            <PointsBadge points={match.points} />
          </>
        ) : match.locked ? (
          <span className="flex items-center gap-1 text-xs text-white/30">
            <Lock size={11} /> Cerrado
          </span>
        ) : saved && !dirty ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Check size={12} /> Guardado
          </span>
        ) : (
          <button
            onClick={handleSave}
            disabled={isPending || (!home && !away)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
            {isPending ? "Guardando…" : match.prediction ? "Actualizar" : "Guardar"}
          </button>
        )}
      </div>

      {/* Pronósticos de todos (solo visible cuando el partido se cierra) */}
      {(match.locked || match.finished) && others.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-white/50 transition hover:text-white/80"
          >
            <Users size={12} /> Pronósticos de todos ({others.length})
            <ChevronDown size={12} className={`transition ${showAll ? "rotate-180" : ""}`} />
          </button>

          {showAll && (
            <ul className="mt-2 grid gap-1">
              {others.map((o) => (
                <li
                  key={o.user_id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs ${
                    o.user_id === currentUserId ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-white/70">
                    {o.name}
                    {o.user_id === currentUserId && <span className="text-white/40"> (tú)</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-white/90">{o.home}–{o.away}</span>
                    {match.finished && <PointsBadge points={o.points} />}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </motion.li>
  )
}
