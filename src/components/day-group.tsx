"use client"

import { useState, useRef, useEffect, useSyncExternalStore } from "react"
import { ChevronDown } from "lucide-react"

const DAY_FMT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
}

const FALLBACK_TZ = "Europe/Madrid"
const noop = () => () => {}

function useLocalDate(iso: string) {
  return useSyncExternalStore(
    noop,
    () => {
      const d = new Date(iso)
      const today = new Date()
      if (d.toLocaleDateString() === today.toLocaleDateString()) return "Hoy"
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (d.toLocaleDateString() === tomorrow.toLocaleDateString()) return "Mañana"
      return new Intl.DateTimeFormat("es-ES", DAY_FMT).format(d)
    },
    () => new Intl.DateTimeFormat("es-ES", { ...DAY_FMT, timeZone: FALLBACK_TZ }).format(new Date(iso)),
  )
}

export function DayGroup({
  firstKickoff,
  matchCount,
  allFinished,
  pointsEarned,
  defaultOpen,
  isToday,
  children,
}: {
  firstKickoff: string
  matchCount: number
  allFinished: boolean
  pointsEarned: number | null
  defaultOpen: boolean
  isToday: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef<HTMLDivElement>(null)
  const label = useLocalDate(firstKickoff)

  useEffect(() => {
    if (isToday && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [isToday])

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left backdrop-blur transition hover:bg-white/[0.07]"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold capitalize text-white/90" suppressHydrationWarning>
            {label}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
            {matchCount} {matchCount === 1 ? "partido" : "partidos"}
          </span>
          {allFinished && (
            <span className="text-[10px] text-white/30">· finalizados</span>
          )}
          {allFinished && pointsEarned != null && pointsEarned > 0 && (
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              +{pointsEarned} pts
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="mt-2 grid gap-3">{children}</ul>
      )}
    </div>
  )
}
