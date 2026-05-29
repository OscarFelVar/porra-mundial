"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function upsertSpecialBets(
  championTeamId: string,
  runnerupTeamId: string,
  topScorer: string,
  poolId: string | null = null,
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("upsert_special_bets", {
    p_pool_id:           poolId,
    p_champion_team_id:  championTeamId,
    p_runnerup_team_id:  runnerupTeamId,
    p_top_scorer:        topScorer.trim(),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/apuestas")
}
