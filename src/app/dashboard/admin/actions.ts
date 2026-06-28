"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendTestEmail, dispatchDigests } from "@/lib/email/digests"

// Verifica que quien llama es admin. RLS es la segunda barrera de seguridad;
// este check da un mensaje claro en caso de acceso no autorizado.
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
  if (!matchId) throw new Error(`saveMatchResult: matchId inválido (recibido: ${JSON.stringify(matchId)})`)
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
  revalidateTag("matches", "default")
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/pronosticos")
  revalidatePath("/dashboard/tabla")
}

// --- Email de prueba: verifica la cadena Brevo enviándote un correo a ti mismo ---
// Devuelve el resultado (no lanza) para que el mensaje de error real de Brevo llegue
// a la UI: Next.js censura los errores LANZADOS desde un server action en producción.
export async function sendTestDigestEmail(): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin()
  return await sendTestEmail()
}

// --- Emails de pronósticos: qué grupo los recibe (null = ninguno) ---
export async function saveDigestPool(poolId: string | null) {
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("app_settings")
    .update({ digest_pool_id: poolId })
    .eq("id", 1)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/admin")
}

// --- Dieciseisavos: asignar equipos manualmente cuando la API aún devuelve TBD ---
export async function saveMatchTeams(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
) {
  if (!matchId) throw new Error(`saveMatchTeams: matchId inválido (recibido: ${JSON.stringify(matchId)})`)
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("matches")
    .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
    .eq("id", matchId)
  if (error) throw new Error(error.message)
  revalidateTag("matches", "default")
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/bracket")
}

// --- Email bracket: borrar log y reenviar con datos correctos ---
export async function resendBracketEmail(): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  await service.from("email_log").delete().eq("kind", "bracket").eq("ref", "main")
  try {
    const result = await dispatchDigests()
    const sent = result.sent.find((s) => s.kind === "bracket")
    if (sent) return { ok: true }
    return { ok: false, error: result.skipped ?? "El email no se envió (revisa configuración)" }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// --- Knockouts: quién avanza (dispara recálculo del cuadro) ---
export async function saveAdvancing(matchId: string, teamId: string | null) {
  if (!matchId) throw new Error(`saveAdvancing: matchId inválido (recibido: ${JSON.stringify(matchId)})`)
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from("matches")
    .update({ advancing_team_id: teamId })
    .eq("id", matchId)
  if (error) throw new Error(error.message)
  revalidateTag("matches", "default")
  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/bracket")
  revalidatePath("/dashboard/tabla")
}
