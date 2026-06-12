"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { Loader2, Check } from "lucide-react"
import { StadiumBackground } from "@/components/stadium-background"
import { createClient } from "@/lib/supabase/client"
import { signInAction, signUpAction, type AuthState } from "./actions"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin")
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signInAction, null)
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUpAction, null)

  // Recuperar contraseña
  const [forgot, setForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotErr, setForgotErr] = useState<string | null>(null)
  const [forgotPending, setForgotPending] = useState(false)

  const isSignup = mode === "signup"
  const action = isSignup ? upAction : inAction
  const state = isSignup ? upState : inState
  const pending = isSignup ? upPending : inPending

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/50"

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotErr(null)
    if (!forgotEmail.trim()) {
      setForgotErr("Pon tu correo.")
      return
    }
    setForgotPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim())
    setForgotPending(false)
    if (error) {
      setForgotErr(error.message)
      return
    }
    setForgotSent(true)
  }

  function backToLogin() {
    setForgot(false)
    setForgotSent(false)
    setForgotErr(null)
    setForgotEmail("")
  }

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-white">
      <StadiumBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur"
      >
        <Link
          href="/"
          className="mb-6 block text-center text-sm text-white/50 transition hover:text-white/80"
        >
          ← Volver
        </Link>

        <h1 className="text-center font-[family-name:var(--font-display)] text-5xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            {forgot ? "Recuperar" : isSignup ? "Crear cuenta" : "Entrar"}
          </span>
        </h1>

        {forgot ? (
          /* ── Recuperar contraseña ─────────────────────────────── */
          forgotSent ? (
            <div className="mt-6 text-center">
              <Check className="mx-auto mb-3 text-emerald-400" size={36} />
              <p className="text-sm text-white/70">
                Si ese correo tiene cuenta, te hemos enviado un enlace para crear una
                nueva contraseña. Revisa tu bandeja (incluido Spam/Promociones).
              </p>
              <button
                type="button"
                onClick={backToLogin}
                className="mt-5 cursor-pointer text-sm text-emerald-300 hover:text-emerald-200"
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="mt-6 flex flex-col gap-3">
              <p className="text-center text-xs text-white/40">
                Pon tu correo y te enviaremos un enlace para crear una contraseña nueva.
              </p>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className={inputClass}
              />

              {forgotErr && <p className="text-sm text-red-300">{forgotErr}</p>}

              <button
                type="submit"
                disabled={forgotPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {forgotPending && <Loader2 size={16} className="animate-spin" />}
                {forgotPending ? "Enviando…" : "Enviar enlace"}
              </button>

              <button
                type="button"
                onClick={backToLogin}
                className="mt-1 cursor-pointer text-center text-sm text-white/50 hover:text-white/80"
              >
                ← Volver
              </button>
            </form>
          )
        ) : (
          <>
            {/* Conmutador de modo */}
            <div className="mt-6 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 cursor-pointer rounded-lg py-2 transition ${
                    mode === m
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-400 font-semibold text-emerald-950"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {m === "signin" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            {/* key={mode} fuerza recrear el form al cambiar de modo (limpia campos) */}
            <form key={mode} action={action} className="mt-6 flex flex-col gap-3">
              {isSignup && (
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Tu nombre"
                  maxLength={40}
                  className={inputClass}
                />
              )}
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                className={inputClass}
              />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "Contraseña (mín. 6)" : "Contraseña"}
                className={inputClass}
              />

              {state?.error && <p className="text-sm text-red-300">{state.error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {pending && <Loader2 size={16} className="animate-spin" />}
                {pending
                  ? "Un momento…"
                  : isSignup
                    ? "Crear cuenta"
                    : "Entrar"}
              </button>
            </form>

            {!isSignup && (
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="mt-3 block w-full cursor-pointer text-center text-xs text-white/40 transition hover:text-white/70"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            <p className="mt-4 text-center text-xs text-white/40">
              {isSignup ? (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="cursor-pointer text-emerald-300 hover:text-emerald-200"
                  >
                    Inicia sesión
                  </button>
                </>
              ) : (
                <>
                  ¿Nuevo por aquí?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="cursor-pointer text-emerald-300 hover:text-emerald-200"
                  >
                    Crea tu cuenta
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </motion.div>
    </main>
  )
}
