"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createPool(name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_pool", { p_name: name })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
  return data
}

export async function joinPool(code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("join_pool", { p_code: code })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
  return data
}
