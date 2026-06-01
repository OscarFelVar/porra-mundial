"use client"

import { useRouter, useSearchParams } from "next/navigation"

type Pool = { id: string; name: string }

export function PoolSelector({ pools, selected }: { pools: Pool[]; selected: string }) {
  const router = useRouter()
  const params = useSearchParams()

  function onChange(id: string) {
    const next = new URLSearchParams(params.toString())
    next.set("pool", id)
    router.push(`/dashboard/tabla?${next.toString()}`)
  }

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {pools.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${
            p.id === selected
              ? "border-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 font-semibold text-emerald-950"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  )
}
