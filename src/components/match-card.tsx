"use client"

import { useState, useTransition } from "react"
import { motion } from "motion/react"
import { Check, Lock, Loader2 } from "lucide-react"
import { upsertPrediction } from "@/app/dashboard/pronosticos/actions"

export type MatchData = {
  id: string
  phase: string
  group_label: string | null
  kickoff_at: string
  home_team: { id: string; name: string; code: string | null; crest_url: string | null } | null
  away_team: { id: string; name: string; code: string | null; crest_url: string | null } | null
  prediction: { home_score: number; away_score: number } | null
  locked: boolean
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

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso))
}

export function MatchCard({ match }: { match: MatchData }) {
  const [home, setHome] = useState(match.prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(match.prediction?.away_score?.toString() ?? "")
  const [saved, setSaved] = useState(!!match.prediction)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
        <span className="text-xs text-white/40">{formatKickoff(match.kickoff_at)}</span>
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
        {match.locked ? (
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

        {match.locked ? (
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
    </motion.li>
  )
}
