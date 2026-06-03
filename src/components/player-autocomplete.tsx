"use client"

import { useState } from "react"

export type Player = { name: string; position: string | null; team: string | null }

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

export function PlayerAutocomplete({
  emoji,
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
}: {
  emoji: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  options: Player[]
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const q = value.trim()
  const matches =
    q.length >= 2
      ? options.filter((p) => norm(p.name).includes(norm(q))).slice(0, 8)
      : []

  return (
    <div className="relative flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {emoji} {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder={hint}
        autoComplete="off"
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-40"
      />
      {open && matches.length > 0 && (
        <ul className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0d1117] py-1 shadow-2xl">
          {matches.map((p) => (
            <li key={`${p.name}-${p.team}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(p.name); setOpen(false) }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10"
              >
                <span className="truncate">{p.name}</span>
                {p.team && <span className="shrink-0 text-xs text-white/40">{p.team}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
