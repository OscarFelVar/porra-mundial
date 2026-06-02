"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AuthState = { error: string } | null

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { error: "Completa correo y contraseña." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "Correo o contraseña incorrectos." }

  redirect("/dashboard")
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!name) return { error: "Pon tu nombre." }
  if (!email) return { error: "Pon tu correo." }
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." }

  const supabase = await createClient()
  // 'name' viaja en user_metadata → el trigger handle_new_user crea el perfil con él.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Ese correo ya está registrado. Inicia sesión." }
    }
    return { error: error.message }
  }

  redirect("/dashboard")
}
