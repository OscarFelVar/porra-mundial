"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, Loader2 } from "lucide-react"
import { saveMatchResult, saveAdvancing } from "@/app/dashboard/admin/actions"

type Team = { id: string; name: string; code: string | null } | null

export type AdminMatch = {
  id: string
  phase: string
  groupLabel: string | null
  kickoffAt: string
  status: "scheduled" | "live" | "finished"
  homeScore: number | null
  awayScore: number | null
  advancingTeamId: string | null
  home: Team
  away: Team
}

const PHASES: { key: string; label: string }[] = [
  { key: "grupos",        label: "Grupos" },
  { key: "dieciseisavos", label: "Dieciseisavos" },
  { key: "octavos",       label: "Octavos" },
  { key: "cuartos",       label: "Cuartos" },
  { key: "semifinal",     label: "Semifinal" },
  { key: "tercer_puesto", label: "3er puesto" },
  { key: "final",         label: "Final" },
]

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso))

export function AdminMatches({ matches }: { matches: AdminMatch[] }) {
  // Solo fases que tienen partidos cargados.
  const available = PHASES.filter((p) => matches.some((m) => m.phase === p.key))
  const [phase, setPhase] = useState(available[0]?.key ?? "grupos")

  const visible = useMemo(
    () => matches.filter((m) => m.phase === phase),
    [matches, phase],
  )

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/70">
        Partidos · marcadores y avance
      </h3>
      <p className="mb-4 text-xs text-white/40">
        El sync trae los marcadores solo. Usa esto para corregir un marcador o, en
        eliminatorias, marcar quién avanza (el cuadro puntúa al hacerlo).
      </p>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {available.map((p) => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              phase === p.key
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-emerald-950"
                : "border border-white/10 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/30">
          Aún no hay partidos en esta fase.
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((m) => (
            <MatchRow key={m.id} match={m} knockout={m.phase !== "grupos"} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchRow({ match, knockout }: { match: AdminMatch; knockout: boolean }) {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "")
  const [away, setAway] = useState(match.awayScore?.toString() ?? "")
  const [status, setStatus] = useState(match.status)
  const [advancing, setAdvancing] = useState<string | null>(match.advancingTeamId)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const scoreOrStatusDirty =
    home !== (match.homeScore?.toString() ?? "") ||
    away !== (match.awayScore?.toString() ?? "") ||
    status !== match.status
  const advDirty = advancing !== match.advancingTeamId
  const dirty = scoreOrStatusDirty || advDirty

  function handleSave() {
    setError(null)
    start(async () => {
      try {
        if (scoreOrStatusDirty) {
          const h = home.trim() === "" ? null : Number(home)
          const a = away.trim() === "" ? null : Number(away)
          await saveMatchResult(match.id, h, a, status)
        }
        if (advDirty) {
          await saveAdvancing(match.id, advancing)
        }
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between text-[11px] text-white/40">
        <span>{match.groupLabel ? `Grupo ${match.groupLabel}` : ""}</span>
        <span>{fmtDate(match.kickoffAt)}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-right text-sm text-white/90">
          {match.home?.name ?? "—"}
        </span>
        <input
          type="number"
          min={0}
          value={home}
          onChange={(e) => { setHome(e.target.value); setSaved(false) }}
          className="w-12 rounded-lg border border-white/10 bg-white/5 py-1.5 text-center text-sm text-white outline-none focus:border-emerald-400/50"
        />
        <span className="text-white/30">·</span>
        <input
          type="number"
          min={0}
          value={away}
          onChange={(e) => { setAway(e.target.value); setSaved(false) }}
          className="w-12 rounded-lg border border-white/10 bg-white/5 py-1.5 text-center text-sm text-white outline-none focus:border-emerald-400/50"
        />
        <span className="flex-1 truncate text-left text-sm text-white/90">
          {match.away?.name ?? "—"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as AdminMatch["status"]); setSaved(false) }}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-400/50 [color-scheme:dark]"
        >
          <option value="scheduled">Programado</option>
          <option value="live">En juego</option>
          <option value="finished">Finalizado</option>
        </select>

        {knockout && (
          <select
            value={advancing ?? ""}
            onChange={(e) => { setAdvancing(e.target.value || null); setSaved(false) }}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400/50 [color-scheme:dark]"
            title="Quién avanza"
          >
            <option value="">Avanza: —</option>
            {match.home && <option value={match.home.id}>Avanza: {match.home.name}</option>}
            {match.away && <option value={match.away.id}>Avanza: {match.away.name}</option>}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          {error && <p className="max-w-[12rem] truncate text-xs text-red-400">{error}</p>}
          {saved && !dirty ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check size={13} /> Guardado
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={isPending || !dirty}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              {isPending ? "…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
