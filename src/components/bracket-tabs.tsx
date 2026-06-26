"use client"

import { useState, type ReactNode } from "react"
import { Users } from "lucide-react"
import Link from "next/link"

const TABS = [
  { key: "real",  label: "Cuadro real" },
  { key: "picks", label: "Mis picks" },
]

export function BracketTabs({
  real,
  myPicks,
  hasPicks,
}: {
  real: ReactNode
  myPicks: ReactNode
  hasPicks: boolean
}) {
  const [tab, setTab] = useState<"real" | "picks">("real")

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "real" | "picks")}
            disabled={t.key === "picks" && !hasPicks}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${
              tab === t.key
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-emerald-950"
                : "border border-white/10 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}

        <Link
          href="/dashboard/bracket/todos"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition hover:text-white"
        >
          <Users size={12} />
          Ver todos
        </Link>
      </div>

      {tab === "real"  && real}
      {tab === "picks" && myPicks}
    </div>
  )
}
