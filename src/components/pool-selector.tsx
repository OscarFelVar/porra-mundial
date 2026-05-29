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
          className={`cursor-pointer rounded-xl border px-3 py-1.5 text-sm transition ${
            p.id === selected
              ? "border-white bg-white font-semibold text-black"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  )
}
