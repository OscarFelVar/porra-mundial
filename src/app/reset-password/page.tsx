"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { Loader2, Check } from "lucide-react"
import { StadiumBackground } from "@/components/stadium-background"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  // Al llegar desde /auth/confirm ya hay sesión de recuperación. Si no la hay,
  // el enlace caducó/no es válido → invitamos a pedir otro.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setChecking(false)
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setPending(true)
    const { error } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => router.push("/dashboard"), 1800)
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/50"

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-white">
      <StadiumBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur"
      >
        <h1 className="text-center font-[family-name:var(--font-display)] text-4xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Nueva contraseña
          </span>
        </h1>

        {checking ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="animate-spin text-white/50" />
          </div>
        ) : done ? (
          <div className="mt-6 text-center">
            <Check className="mx-auto mb-3 text-emerald-400" size={36} />
            <p className="text-sm text-white/70">
              Contraseña actualizada. Entrando…
            </p>
          </div>
        ) : !hasSession ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              El enlace no es válido o ha caducado. Vuelve a pedir uno nuevo desde
              «¿Olvidaste tu contraseña?» en la pantalla de inicio de sesión.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:opacity-90"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <p className="text-center text-xs text-white/40">
              Escribe tu nueva contraseña. Luego entra con ella en la app.
            </p>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Nueva contraseña (mín. 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <input
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />

            {error && <p className="text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </motion.div>
    </main>
  )
}
