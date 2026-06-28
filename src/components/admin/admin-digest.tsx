"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Mail, Send } from "lucide-react"
import { saveDigestPool, sendTestDigestEmail, resendBracketEmail } from "@/app/dashboard/admin/actions"

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

  // Email de prueba (Brevo)
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [testErr, setTestErr] = useState<string | null>(null)
  const [testPending, startTest] = useTransition()

  // Reenvío email bracket
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [resendErr, setResendErr] = useState<string | null>(null)
  const [resendPending, startResend] = useTransition()

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

  function handleResend() {
    setResendErr(null)
    setResendMsg(null)
    startResend(async () => {
      try {
        const res = await resendBracketEmail()
        if (res.ok) setResendMsg("Email del cuadro reenviado a todos los participantes.")
        else setResendErr(res.error ?? "Error desconocido")
      } catch (e) {
        setResendErr((e as Error).message)
      }
    })
  }

  function handleTest() {
    setTestErr(null)
    setTestMsg(null)
    startTest(async () => {
      try {
        const res = await sendTestDigestEmail()
        if (res.ok) setTestMsg("Enviado por Brevo. Revisa tu bandeja (incluido Promociones/Spam).")
        else setTestErr(res.error ?? "Error desconocido")
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

      {/* Email de prueba: verifica la cadena de Brevo enviándote un correo a ti mismo. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <button
          onClick={handleTest}
          disabled={testPending}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40"
        >
          {testPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {testPending ? "Enviando…" : "Probar Brevo (a tu correo)"}
        </button>
        {testMsg && <span className="text-xs text-emerald-400">{testMsg}</span>}
        {testErr && <span className="max-w-[18rem] truncate text-xs text-red-400">{testErr}</span>}

        <span className="w-full text-[11px] text-white/30">
          «Probar Brevo» manda un correo de prueba a tu propio correo vía Brevo para verificar al
          instante que el envío funciona (API key + remitente + entrega), sin tocar plazos ni avisar a nadie.
        </span>
      </div>

      {/* Reenvío email bracket */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <button
          onClick={handleResend}
          disabled={resendPending}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs font-semibold text-amber-200/80 transition hover:bg-amber-400/10 disabled:opacity-40"
        >
          {resendPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {resendPending ? "Enviando…" : "Reenviar email cuadro eliminatorias"}
        </button>
        {resendMsg && <span className="text-xs text-emerald-400">{resendMsg}</span>}
        {resendErr && <span className="max-w-[18rem] truncate text-xs text-red-400">{resendErr}</span>}
        <span className="w-full text-[11px] text-white/30">
          Borra el registro de envío y reenvía el email del cuadro completo a todos los participantes del grupo.
        </span>
      </div>
    </div>
  )
}
