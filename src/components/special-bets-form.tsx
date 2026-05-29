"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Lock } from "lucide-react"
import { upsertSpecialBets } from "@/app/dashboard/apuestas/actions"

export type Team = {
  id: string
  name: string
  code: string | null
  crest_url: string | null
}

type Bet = {
  champion_team_id: string | null
  runnerup_team_id: string | null
  top_scorer: string | null
}

function TeamPreview({ team }: { team: Team | undefined }) {
  if (!team) return <div className="h-14" />
  return (
    <div className="flex items-center gap-2 pt-1">
      {team.crest_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crest_url} alt={team.name} width={28} height={28} className="h-7 w-7 object-contain" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-white/10" />
      )}
      <span className="text-sm text-white/70">{team.name}</span>
    </div>
  )
}

function TeamSelect({
  label,
  value,
  onChange,
  teams,
  exclude,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  teams: Team[]
  exclude?: string
  disabled: boolean
}) {
  const filtered = teams.filter((t) => t.id !== exclude)
  const selected = teams.find((t) => t.id === value)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40 [&>option]:bg-[#0d1117]"
      >
        <option value="">— Elige un equipo —</option>
        {filtered.map((t) => (
          <option key={t.id} value={t.id}>
            {t.code ? `${t.code} · ` : ""}{t.name}
          </option>
        ))}
      </select>
      <TeamPreview team={selected} />
    </div>
  )
}

export function SpecialBetsForm({
  teams,
  existing,
  deadline,
  closed,
}: {
  teams: Team[]
  existing: Bet | null
  deadline: string | null
  closed: boolean
}) {
  const [champion, setChampion] = useState(existing?.champion_team_id ?? "")
  const [runnerup, setRunnerup] = useState(existing?.runnerup_team_id ?? "")
  const [scorer, setScorer] = useState(existing?.top_scorer ?? "")
  const [saved, setSaved] = useState(!!existing)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty =
    champion !== (existing?.champion_team_id ?? "") ||
    runnerup !== (existing?.runnerup_team_id ?? "") ||
    scorer   !== (existing?.top_scorer ?? "")

  function handleSave() {
    if (!champion || !runnerup || !scorer.trim()) {
      setError("Completa los tres campos")
      return
    }
    if (champion === runnerup) {
      setError("El campeón y el subcampeón no pueden ser el mismo equipo")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await upsertSpecialBets(champion, runnerup, scorer)
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      {/* Deadline */}
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
        <TeamSelect
          label="🥇 Campeón del Mundial"
          value={champion}
          onChange={(v) => { setChampion(v); setSaved(false) }}
          teams={teams}
          exclude={runnerup}
          disabled={closed}
        />
        <TeamSelect
          label="🥈 Subcampeón"
          value={runnerup}
          onChange={(v) => { setRunnerup(v); setSaved(false) }}
          teams={teams}
          exclude={champion}
          disabled={closed}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
            ⚽ Máximo goleador
          </label>
          <input
            type="text"
            value={scorer}
            onChange={(e) => { setScorer(e.target.value); setSaved(false) }}
            disabled={closed}
            placeholder="Nombre del jugador"
            maxLength={60}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-end gap-3">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!closed && (
          saved && !dirty ? (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check size={14} /> Guardado
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? "Guardando…" : existing ? "Actualizar" : "Guardar"}
            </button>
          )
        )}
      </div>
    </div>
  )
}
