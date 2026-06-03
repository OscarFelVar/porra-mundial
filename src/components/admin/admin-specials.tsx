"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, CalendarClock, Trophy } from "lucide-react"
import { PlayerAutocomplete, type Player } from "@/components/player-autocomplete"
import { saveSpecialResults, saveSpecialDeadline } from "@/app/dashboard/admin/actions"

type Results = {
  top_scorer: string | null
  mvp: string | null
  best_goalkeeper: string | null
}

// ISO (UTC) -> valor para <input type="datetime-local"> en hora local del navegador.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminSpecials({
  players,
  deadline,
  results,
}: {
  players: Player[]
  deadline: string | null
  results: Results
}) {
  const goalkeepers = players.filter((p) => p.position === "Goalkeeper")

  // --- Resultados reales ---
  const [scorer, setScorer] = useState(results.top_scorer ?? "")
  const [mvp, setMvp] = useState(results.mvp ?? "")
  const [gk, setGk] = useState(results.best_goalkeeper ?? "")
  const [resSaved, setResSaved] = useState(false)
  const [resError, setResError] = useState<string | null>(null)
  const [resPending, startRes] = useTransition()

  const resDirty =
    scorer !== (results.top_scorer ?? "") ||
    mvp !== (results.mvp ?? "") ||
    gk !== (results.best_goalkeeper ?? "")

  function handleResults() {
    setResError(null)
    startRes(async () => {
      try {
        await saveSpecialResults(scorer, mvp, gk)
        setResSaved(true)
      } catch (e) {
        setResError((e as Error).message)
      }
    })
  }

  // --- Fecha límite ---
  const [dl, setDl] = useState(isoToLocalInput(deadline))
  const [dlSaved, setDlSaved] = useState(false)
  const [dlError, setDlError] = useState<string | null>(null)
  const [dlPending, startDl] = useTransition()
  const dlDirty = dl !== isoToLocalInput(deadline)

  function handleDeadline() {
    setDlError(null)
    startDl(async () => {
      try {
        // datetime-local se interpreta como hora local del navegador -> ISO UTC.
        const iso = dl ? new Date(dl).toISOString() : null
        await saveSpecialDeadline(iso)
        setDlSaved(true)
      } catch (e) {
        setDlError((e as Error).message)
      }
    })
  }

  return (
    <div className="grid gap-5">
      {/* Resultados reales */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-300/90">
          <Trophy size={15} /> Resultados de especiales
        </h3>
        <p className="mb-5 text-xs text-white/40">
          Al guardar, se recalculan los puntos de todos los jugadores automáticamente.
        </p>

        <div className="grid gap-5">
          <PlayerAutocomplete
            emoji="⚽"
            label="Máximo goleador"
            hint="Nombre del goleador real"
            value={scorer}
            onChange={(v) => { setScorer(v); setResSaved(false) }}
            options={players}
            disabled={false}
          />
          <PlayerAutocomplete
            emoji="🏅"
            label="MVP del Mundial"
            hint="Mejor jugador del torneo"
            value={mvp}
            onChange={(v) => { setMvp(v); setResSaved(false) }}
            options={players}
            disabled={false}
          />
          <PlayerAutocomplete
            emoji="🧤"
            label="Mejor portero"
            hint="Mejor portero del torneo"
            value={gk}
            onChange={(v) => { setGk(v); setResSaved(false) }}
            options={goalkeepers}
            disabled={false}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {resError && <p className="text-xs text-red-400">{resError}</p>}
          {resSaved && !resDirty ? (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check size={14} /> Guardado
            </span>
          ) : (
            <button
              onClick={handleResults}
              disabled={resPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:opacity-90 disabled:opacity-40"
            >
              {resPending && <Loader2 size={13} className="animate-spin" />}
              {resPending ? "Guardando…" : "Guardar resultados"}
            </button>
          )}
        </div>
      </div>

      {/* Fecha límite */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-300/90">
          <CalendarClock size={15} /> Fecha límite de apuestas especiales
        </h3>
        <p className="mb-5 text-xs text-white/40">
          Hora local. Pásala al inicio del primer partido. Tras esta fecha, nadie puede cambiar sus especiales.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={dl}
            onChange={(e) => { setDl(e.target.value); setDlSaved(false) }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/50 [color-scheme:dark]"
          />
          {dl && (
            <button
              type="button"
              onClick={() => { setDl(""); setDlSaved(false) }}
              className="text-xs text-white/40 underline transition hover:text-white/70"
            >
              borrar
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {dlError && <p className="text-xs text-red-400">{dlError}</p>}
            {dlSaved && !dlDirty ? (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <Check size={14} /> Guardado
              </span>
            ) : (
              <button
                onClick={handleDeadline}
                disabled={dlPending}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-40"
              >
                {dlPending && <Loader2 size={13} className="animate-spin" />}
                {dlPending ? "Guardando…" : "Guardar fecha"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
