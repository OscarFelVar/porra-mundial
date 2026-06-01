"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { StadiumBackground } from "@/components/stadium-background";

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
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
            Entrar
          </span>
        </h1>
        <p className="mt-2 text-center text-sm text-white/55">
          Te enviamos un enlace mágico a tu correo, sin contraseñas.
        </p>

        {status === "sent" ? (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-sm text-emerald-200">
            ✉️ Revisa <strong>{email}</strong> y abre el enlace para entrar.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "Enviando…" : "Enviar enlace"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-300">{errorMsg}</p>
            )}
          </form>
        )}
      </motion.div>
    </main>
  );
}
