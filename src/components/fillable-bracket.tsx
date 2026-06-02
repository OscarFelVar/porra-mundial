"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, Crown, Loader2 } from "lucide-react"
import { saveBracketPicks, type BracketPick } from "@/app/dashboard/bracket/actions"

export type Team = { id: string; name: string; code: string | null; crest_url: string | null }
export type R32Match = { slot: number; home: Team; away: Team }

// Rondas con eliminación directa (16avos viene de los partidos reales).
const ROUNDS: { key: string; label: string; slots: number }[] = [
  { key: "dieciseisavos", label: "16avos",  slots: 16 },
  { key: "octavos",       label: "Octavos", slots: 8 },
  { key: "cuartos",       label: "Cuartos", slots: 4 },
  { key: "semifinal",     label: "Semis",   slots: 2 },
  { key: "final",         label: "Final",   slots: 1 },
]

const TOTAL_SLOTS = 16 + 8 + 4 + 2 + 1 + 1 // + 3.er puesto

export function FillableBracket({
  matches,
  initialPicks,
  demo = false,
}: {
  matches: R32Match[]
  initialPicks: { round: string; slot: number; predicted_team_id: string }[]
  demo?: boolean
}) {
  const teamMap = useMemo(() => {
    const m = new Map<string, Team>()
    for (const mt of matches) {
      m.set(mt.home.id, mt.home)
      m.set(mt.away.id, mt.away)
    }
    return m
  }, [matches])

  const matchBySlot = useMemo(() => {
    const m = new Map<number, R32Match>()
    for (const mt of matches) m.set(mt.slot, mt)
    return m
  }, [matches])

  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const p of initialPicks) init[`${p.round}:${p.slot}`] = p.predicted_team_id
    return init
  })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, startSave] = useTransition()

  // Candidatos de una llave: en 16avos vienen del partido real; en rondas
  // posteriores son los ganadores elegidos en las dos llaves que alimentan.
  function candidates(roundIndex: number, slot: number, p: Record<string, string>): (Team | null)[] {
    if (roundIndex === 0) {
      const m = matchBySlot.get(slot)
      return [m?.home ?? null, m?.away ?? null]
    }
    const prev = ROUNDS[roundIndex - 1].key
    const a = p[`${prev}:${slot * 2}`]
    const b = p[`${prev}:${slot * 2 + 1}`]
    return [a ? teamMap.get(a) ?? null : null, b ? teamMap.get(b) ?? null : null]
  }

  function sfLoser(slot: number, p: Record<string, string>): Team | null {
    const cands = candidates(3, slot, p) // semifinal = índice 3
    const winner = p[`semifinal:${slot}`]
    const loser = cands.find((c) => c && c.id !== winner)
    return loser ?? null
  }

  function thirdPlaceCandidates(p: Record<string, string>): (Team | null)[] {
    return [sfLoser(0, p), sfLoser(1, p)]
  }

  // Tras cada cambio, elimina elecciones que dejaron de ser válidas (cascada).
  function prune(p: Record<string, string>): Record<string, string> {
    const next = { ...p }
    for (let ri = 1; ri < ROUNDS.length; ri++) {
      const round = ROUNDS[ri]
      for (let s = 0; s < round.slots; s++) {
        const ids = candidates(ri, s, next).filter(Boolean).map((t) => t!.id)
        const k = `${round.key}:${s}`
        if (next[k] && !ids.includes(next[k])) delete next[k]
      }
    }
    const tp = thirdPlaceCandidates(next).filter(Boolean).map((t) => t!.id)
    if (next["tercer_puesto:0"] && !tp.includes(next["tercer_puesto:0"])) delete next["tercer_puesto:0"]
    return next
  }

  function pick(key: string, teamId: string) {
    setSaved(false)
    setPicks((prev) => prune({ ...prev, [key]: teamId }))
  }

  function handleSave() {
    setError(null)
    const all: BracketPick[] = Object.entries(picks).map(([k, teamId]) => {
      const [round, slot] = k.split(":")
      return { round, slot: Number(slot), teamId }
    })
    startSave(async () => {
      try {
        await saveBracketPicks(all)
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const champion = picks["final:0"] ? teamMap.get(picks["final:0"]) : null
  const filled = Object.keys(picks).length

  return (
    <div>
      {/* Barra superior */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm text-white/50">
          {filled}/{TOTAL_SLOTS} llaves
          {champion && (
            <span className="ml-3 inline-flex items-center gap-1 text-yellow-300">
              <Crown size={14} /> {champion.name}
            </span>
          )}
        </div>
        {!demo && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {isSaving ? "Guardando…" : saved ? "Guardado" : "Guardar cuadro"}
          </button>
        )}
      </div>

      {demo && (
        <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs text-amber-200/80">
          Modo demostración con equipos de prueba. Aquí no se guarda nada — es solo para ver cómo funcionará el cuadro.
        </p>
      )}
      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

      {/* Cuadro */}
      <div className="-mx-6 overflow-x-auto px-6 pb-4">
        <div className="flex min-w-max items-stretch gap-3">
          {ROUNDS.map((round, ri) => (
            <div key={round.key} className="flex w-[12rem] shrink-0 flex-col">
              <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                {round.label}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {Array.from({ length: round.slots }).map((_, s) => {
                  const cands = candidates(ri, s, picks)
                  const key = `${round.key}:${s}`
                  return (
                    <SlotCard
                      key={key}
                      candidates={cands}
                      selected={picks[key]}
                      onPick={(id) => pick(key, id)}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* 3.er puesto */}
          <div className="flex w-[12rem] shrink-0 flex-col justify-end">
            <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/50">
              3.er puesto
            </h3>
            <SlotCard
              candidates={thirdPlaceCandidates(picks)}
              selected={picks["tercer_puesto:0"]}
              onPick={(id) => pick("tercer_puesto:0", id)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SlotCard({
  candidates,
  selected,
  onPick,
}: {
  candidates: (Team | null)[]
  selected?: string
  onPick: (teamId: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur">
      {candidates.map((team, i) => {
        const isSel = !!team && team.id === selected
        return (
          <div key={i}>
            {i === 1 && <div className="h-px bg-white/10" />}
            <button
              type="button"
              disabled={!team}
              onClick={() => team && onPick(team.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                team ? "cursor-pointer hover:bg-white/[0.06]" : "cursor-default"
              } ${isSel ? "bg-emerald-400/10" : ""}`}
            >
              {team?.crest_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.crest_url} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" />
              ) : (
                <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/10" />
              )}
              <span className={`min-w-0 flex-1 truncate text-xs ${isSel ? "font-semibold text-emerald-300" : team ? "text-white/80" : "text-white/30"}`}>
                {team?.name ?? "Por definir"}
              </span>
              {isSel && <Check size={13} className="shrink-0 text-emerald-300" />}
            </button>
          </div>
        )
      })}
    </div>
  )
}
