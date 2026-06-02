"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Lock } from "lucide-react"
import { upsertSpecialBets } from "@/app/dashboard/apuestas/actions"

type Bet = {
  top_scorer: string | null
  mvp: string | null
  best_goalkeeper: string | null
}

function Field({
  emoji,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  emoji: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {emoji} {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={hint}
        maxLength={60}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  )
}

export function SpecialBetsForm({
  existing,
  deadline,
  closed,
}: {
  existing: Bet | null
  deadline: string | null
  closed: boolean
}) {
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
          {deadline
            ? `Cierra: ${new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(deadline))}`
            : "Cierran antes del primer partido (11 jun)"}
        </p>
        {closed && (
          <span className="flex items-center gap-1 text-xs text-white/30">
            <Lock size={11} /> Cerrado
          </span>
        )}
      </div>

      <div className="grid gap-5">
        <Field
          emoji="⚽"
          label="Máximo goleador"
          hint="Nombre del jugador"
          value={scorer}
          onChange={(v) => { setScorer(v); setSaved(false) }}
          disabled={closed}
        />
        <Field
          emoji="🏅"
          label="MVP del Mundial"
          hint="Mejor jugador del torneo"
          value={mvp}
          onChange={(v) => { setMvp(v); setSaved(false) }}
          disabled={closed}
        />
        <Field
          emoji="🧤"
          label="Valla menos vencida"
          hint="Portero menos goleado"
          value={gk}
          onChange={(v) => { setGk(v); setSaved(false) }}
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
