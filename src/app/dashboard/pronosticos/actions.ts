"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function upsertPrediction(
  matchId: string,
  homeScore: number,
  awayScore: number,
  poolId: string | null = null,
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("upsert_prediction", {
    p_match_id:   matchId,
    p_pool_id:    poolId,
    p_home_score: homeScore,
    p_away_score: awayScore,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/pronosticos")
}
