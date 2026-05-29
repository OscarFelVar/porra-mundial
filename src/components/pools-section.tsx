"use client"

import { useState, useTransition } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Copy, Check, Plus, Hash, Shield, Users } from "lucide-react"
import { createPool, joinPool } from "@/app/dashboard/actions"

export type Pool = {
  id: string
  name: string
  invite_code: string
  role: "owner" | "member"
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

function PoolCard({
  pool,
  copied,
  onCopy,
}: {
  pool: Pool
  copied: boolean
  onCopy: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur transition hover:bg-white/[0.07]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-[family-name:var(--font-display)] text-lg uppercase tracking-tight text-white">
            {pool.name}
          </h3>
          {pool.role === "owner" && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
              <Shield size={9} />
              dueño
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-white/40">Código de invitación</p>
      </div>

      <button
        onClick={onCopy}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white/80 transition hover:bg-white/10 active:scale-95"
        title="Copiar código"
      >
        <span className="tracking-widest">{pool.invite_code}</span>
        {copied ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} className="text-white/40" />
        )}
      </button>
    </li>
  )
}

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
      {children}
    </div>
  )
}

function ModalInput({
  value,
  onChange,
  placeholder,
  maxLength,
  onKeyDown,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  return (
    <input
      className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 focus:ring-0 transition"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      onKeyDown={onKeyDown}
      autoFocus
    />
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function PoolsSection({ pools }: { pools: Pool[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create state
  const [createOpen, setCreateOpen] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, startCreate] = useTransition()

  // Join state
  const [joinOpen, setJoinOpen] = useState(false)
  const [codeValue, setCodeValue] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, startJoin] = useTransition()

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleCreate() {
    if (!nameValue.trim()) return
    setCreateError(null)
    startCreate(async () => {
      try {
        await createPool(nameValue.trim())
        setNameValue("")
        setCreateOpen(false)
      } catch (e) {
        setCreateError((e as Error).message)
      }
    })
  }

  function handleJoin() {
    if (!codeValue.trim()) return
    setJoinError(null)
    startJoin(async () => {
      try {
        await joinPool(codeValue.trim())
        setCodeValue("")
        setJoinOpen(false)
      } catch (e) {
        setJoinError((e as Error).message)
      }
    })
  }

  const backdropClass =
    "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
  const popupClass =
    "fixed inset-0 z-50 flex items-center justify-center p-4"

  return (
    <section className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/70">
          <Users size={16} />
          <span className="font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-white">
            Mis grupos
          </span>
        </div>
        <div className="flex gap-2">
          {/* ── Unirse con código ── */}
          <Dialog.Root
            open={joinOpen}
            onOpenChange={(open) => {
              setJoinOpen(open)
              if (!open) { setCodeValue(""); setJoinError(null) }
            }}
          >
            <Dialog.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10">
              <Hash size={14} />
              Unirse
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className={backdropClass} />
              <Dialog.Popup className={popupClass}>
                <ModalCard>
                  <Dialog.Title className="font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-white">
                    Unirse a un grupo
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-white/50">
                    Pide el código al dueño del grupo e introdúcelo abajo.
                  </Dialog.Description>
                  <ModalInput
                    value={codeValue}
                    onChange={(v) => setCodeValue(v.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  />
                  {joinError && (
                    <p className="mt-2 text-xs text-red-400">{joinError}</p>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <Dialog.Close className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10">
                      Cancelar
                    </Dialog.Close>
                    <button
                      onClick={handleJoin}
                      disabled={isJoining || !codeValue.trim()}
                      className="cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                    >
                      {isJoining ? "Uniéndose…" : "Unirse"}
                    </button>
                  </div>
                </ModalCard>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>

          {/* ── Crear grupo ── */}
          <Dialog.Root
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) { setNameValue(""); setCreateError(null) }
            }}
          >
            <Dialog.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
              <Plus size={14} />
              Crear grupo
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className={backdropClass} />
              <Dialog.Popup className={popupClass}>
                <ModalCard>
                  <Dialog.Title className="font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-white">
                    Crear grupo
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-white/50">
                    Ponle nombre a tu grupo — el código de invitación se genera solo.
                  </Dialog.Description>
                  <ModalInput
                    value={nameValue}
                    onChange={setNameValue}
                    placeholder="La porra de la oficina…"
                    maxLength={60}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                  {createError && (
                    <p className="mt-2 text-xs text-red-400">{createError}</p>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <Dialog.Close className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10">
                      Cancelar
                    </Dialog.Close>
                    <button
                      onClick={handleCreate}
                      disabled={isCreating || !nameValue.trim()}
                      className="cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                    >
                      {isCreating ? "Creando…" : "Crear"}
                    </button>
                  </div>
                </ModalCard>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Pool list */}
      {pools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center text-white/40">
          <span className="text-4xl">🏆</span>
          <p className="mt-3 text-sm">Aún no tienes grupos</p>
          <p className="mt-1 text-xs">Crea uno o únete con un código de invitación</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {pools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              copied={copiedId === pool.id}
              onCopy={() => copyCode(pool.invite_code, pool.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
