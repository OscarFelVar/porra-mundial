"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type BracketPick = { round: string; slot: number; teamId: string }

// Guarda el cuadro como SINCRONIZACIÓN completa (default, pool_id null):
// upserta lo enviado y borra las llaves que ya no estén (cascada).
export async function saveBracketPicks(picks: BracketPick[]) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("save_bracket", {
    p_pool_id: null,
    p_picks:   picks.map((p) => ({ round: p.round, slot: p.slot, team_id: p.teamId })),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/bracket")
}
