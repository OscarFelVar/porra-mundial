"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateProfile({
  displayName,
  avatarUrl,
}: {
  displayName: string
  avatarUrl: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const name = displayName.trim()
  if (!name) throw new Error("El nombre no puede estar vacío")
  if (name.length > 40) throw new Error("El nombre es demasiado largo (máx. 40)")

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, avatar_url: avatarUrl })
    .eq("id", user.id)
  if (error) throw new Error(error.message)

  // La cabecera y la tabla muestran nombre/foto: refrescar todo el dashboard.
  revalidatePath("/dashboard", "layout")
}
