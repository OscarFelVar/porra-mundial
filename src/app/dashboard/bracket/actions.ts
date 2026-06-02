"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type BracketPick = { round: string; slot: number; teamId: string }

// Guarda todas las elecciones del cuadro (default, pool_id null).
export async function saveBracketPicks(picks: BracketPick[]) {
  const supabase = await createClient()
  for (const p of picks) {
    const { error } = await supabase.rpc("upsert_bracket_pick", {
      p_round:   p.round,
      p_slot:    p.slot,
      p_team_id: p.teamId,
      p_pool_id: null,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath("/dashboard/bracket")
}
