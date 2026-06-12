"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Lock } from "lucide-react"
import { upsertSpecialBets } from "@/app/dashboard/apuestas/actions"
import { PlayerAutocomplete, type Player } from "@/components/player-autocomplete"
import { LocalTime } from "@/components/local-time"

const DEADLINE_FMT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
}

export type { Player }

type Bet = {
  top_scorer: string | null
  mvp: string | null
  best_goalkeeper: string | null
}

export function SpecialBetsForm({
  existing,
  deadline,
  closed,
  players,
}: {
  existing: Bet | null
  deadline: string | null
  closed: boolean
  players: Player[]
}) {
  const goalkeepers = players.filter((p) => p.position === "Goalkeeper")

  const [scorer, setScorer] = useState(existing?.top_scorer ?? "")
  const [mvp, setMvp] = useState(existing?.mvp ?? "")
  const [gk, setGk] = useState(existing?.best_goalkeeper ?? "")
  const [saved, setSaved] = useState(!!existing)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty =
    scorer !== (existing?.top_scorer ?? "") ||
    mvp !== (existing?.mvp ?? "") ||
    gk !== (existing?.best_goalkeeper ?? "")

  function handleSave() {
    if (!scorer.trim() && !mvp.trim() && !gk.trim()) {
      setError("Completa al menos un premio")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await upsertSpecialBets(scorer, mvp, gk)
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-white/40">
          {deadline ? (
            <>Cierra: <LocalTime iso={deadline} options={DEADLINE_FMT} /></>
          ) : (
            "Cierran antes del primer partido (11 jun)"
          )}
        </p>
        {closed && (
          <span className="flex items-center gap-1 text-xs text-white/30">
            <Lock size={11} /> Cerrado
          </span>
        )}
      </div>

      <div className="grid gap-5">
        <PlayerAutocomplete
          emoji="⚽"
          label="Máximo goleador"
          hint="Empieza a escribir el nombre…"
          value={scorer}
          onChange={(v) => { setScorer(v); setSaved(false) }}
          options={players}
          disabled={closed}
        />
        <PlayerAutocomplete
          emoji="🏅"
          label="MVP del Mundial"
          hint="Mejor jugador del torneo"
          value={mvp}
          onChange={(v) => { setMvp(v); setSaved(false) }}
          options={players}
          disabled={closed}
        />
        <PlayerAutocomplete
          emoji="🧤"
          label="Mejor portero"
          hint="El mejor portero del torneo"
          value={gk}
          onChange={(v) => { setGk(v); setSaved(false) }}
          options={goalkeepers}
          disabled={closed}
        />
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!closed &&
          (saved && !dirty ? (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check size={14} /> Guardado
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-40"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? "Guardando…" : existing ? "Actualizar" : "Guardar"}
            </button>
          ))}
      </div>
    </div>
  )
}
