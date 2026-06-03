"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// Verifica que quien llama es admin. RLS es la barrera real (todas las
// escrituras a matches/app_settings exigen is_admin()); esto solo da un
// mensaje claro en vez del silencio de una fila no afectada.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) throw new Error("Solo el administrador puede hacer esto")
  return supabase
}

// --- Especiales: resultados reales (dispara el recálculo de puntos) ---
export async function saveSpecialResults(
  topScorer: string,
  mvp: string,
  bestGoalkeeper: string,
) {
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("app_settings")
    .update({
      result_top_scorer:      topScorer.trim() || null,
      result_mvp:             mvp.trim() || null,
      result_best_goalkeeper: bestGoalkeeper.trim() || null,
    })
    .eq("id", 1)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/tabla")
}

// --- Especiales: fecha límite de apuestas ---
export async function saveSpecialDeadline(deadlineIso: string | null) {
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("app_settings")
    .update({ special_bets_deadline: deadlineIso })
    .eq("id", 1)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/apuestas")
}

// --- Marcador / estado de un partido (dispara recálculo de partido + bracket) ---
export async function saveMatchResult(
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
  status: "scheduled" | "live" | "finished",
) {
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("matches")
    .update({
      home_score_90: homeScore,
      away_score_90: awayScore,
      status,
    })
    .eq("id", matchId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/pronosticos")
  revalidatePath("/dashboard/tabla")
}

// --- Knockouts: quién avanza (dispara recálculo del cuadro) ---
export async function saveAdvancing(matchId: string, teamId: string | null) {
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("matches")
    .update({ advancing_team_id: teamId })
    .eq("id", matchId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/bracket")
  revalidatePath("/dashboard/tabla")
}
