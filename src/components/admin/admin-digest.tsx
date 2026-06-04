"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Mail, Send } from "lucide-react"
import { saveDigestPool, sendTestDigestEmail } from "@/app/dashboard/admin/actions"

export type PoolOption = { id: string; name: string }

export function AdminDigest({
  pools,
  current,
}: {
  pools: PoolOption[]
  current: string | null
}) {
  const [value, setValue] = useState<string>(current ?? "")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const dirty = value !== (current ?? "")

  // Email de prueba
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [testErr, setTestErr] = useState<string | null>(null)
  const [testPending, startTest] = useTransition()

  function handleSave() {
    setError(null)
    start(async () => {
      try {
        await saveDigestPool(value || null)
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  function handleTest() {
    setTestErr(null)
    setTestMsg(null)
    startTest(async () => {
      try {
        await sendTestDigestEmail()
        setTestMsg("Enviado. Revisa la bandeja de felipe.cvvargas@gmail.com.")
      } catch (e) {
        setTestErr((e as Error).message)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-300/90">
        <Mail size={15} /> Emails de pronósticos
      </h3>
      <p className="mb-5 text-xs text-white/40">
        Solo este grupo recibe por email la foto de los pronósticos al cerrarse cada
        franja, el cuadro y las especiales. Los demás grupos no reciben nada. Deja
        &quot;Ninguno&quot; para desactivar el envío.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50 [color-scheme:dark]"
        >
          <option value="">Ninguno (desactivado)</option>
          {pools.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-3">
          {error && <p className="max-w-[14rem] truncate text-xs text-red-400">{error}</p>}
          {saved && !dirty ? (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check size={14} /> Guardado
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={isPending || !dirty}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 px-4 py-2 text-sm font-semibold text-violet-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>

      {pools.length === 0 && (
        <p className="mt-3 text-xs text-amber-200/70">
          Aún no hay grupos creados. Crea el grupo primero y vuelve aquí para elegirlo.
        </p>
      )}

      {/* Email de prueba: verifica la conexión con Resend (no reenvía a nadie). */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <button
          onClick={handleTest}
          disabled={testPending}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40"
        >
          {testPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {testPending ? "Enviando…" : "Enviar email de prueba"}
        </button>
        {testMsg && <span className="text-xs text-emerald-400">{testMsg}</span>}
        {testErr && <span className="max-w-[18rem] truncate text-xs text-red-400">{testErr}</span>}
        <span className="w-full text-[11px] text-white/30">
          Manda un correo de prueba a tu bandeja vía Resend. No lleva destinatarios, así que el reenvío no actúa.
        </span>
      </div>
    </div>
  )
}
