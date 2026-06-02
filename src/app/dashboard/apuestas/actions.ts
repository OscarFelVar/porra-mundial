"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function upsertSpecialBets(
  topScorer: string,
  mvp: string,
  bestGoalkeeper: string,
  poolId: string | null = null,
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("upsert_special_bets", {
    p_pool_id:         poolId,
    p_top_scorer:      topScorer.trim() || null,
    p_mvp:             mvp.trim() || null,
    p_best_goalkeeper: bestGoalkeeper.trim() || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/apuestas")
}
