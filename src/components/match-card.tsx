"use client"

import { useState, useTransition } from "react"
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
      className="w-12 rounded-xl border border-white/10 bg-white/5 py-2 text-center text-lg font-bold text-white outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
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

  const phaseLabel = match.group_label ? `Grupo ${match.group_label}` : match.phase

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
      {/* Meta */}
      <div className="mb-3 flex items-center justify-between text-xs text-white/40">
        <span className="uppercase tracking-wider">{phaseLabel}</span>
        <span>{formatKickoff(match.kickoff_at)}</span>
      </div>

      {/* Teams + inputs */}
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          {match.home_team?.crest_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={match.home_team.crest_url}
              alt={match.home_team.name}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/10" />
          )}
          <span className="truncate text-xs font-medium text-white/80">
            {match.home_team?.name ?? "—"}
          </span>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-2">
          <ScoreInput value={home} onChange={(v) => { setHome(v); setSaved(false) }} disabled={match.locked} />
          <span className="text-white/30">:</span>
          <ScoreInput value={away} onChange={(v) => { setAway(v); setSaved(false) }} disabled={match.locked} />
        </div>

        {/* Away */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          {match.away_team?.crest_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={match.away_team.crest_url}
              alt={match.away_team.name}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/10" />
          )}
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
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
            {isPending ? "Guardando…" : match.prediction ? "Actualizar" : "Guardar"}
          </button>
        )}
      </div>
    </li>
  )
}
