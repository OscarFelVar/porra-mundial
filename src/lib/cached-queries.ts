import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const getCachedMatches = unstable_cache(
  async () => {
    const supabase = adminSupabase()
    const { data } = await supabase
      .from("matches")
      .select(`
        id,
        phase,
        group_label,
        kickoff_at,
        status,
        home_score_90,
        away_score_90,
        home_team:home_team_id ( id, name, code, crest_url ),
        away_team:away_team_id ( id, name, code, crest_url )
      `)
      .order("kickoff_at", { ascending: true })
    return data ?? []
  },
  ["matches-all"],
  { revalidate: 60, tags: ["matches"] },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PredRow = { user_id: string; name: string; home: number; away: number; points: number | null }

export const getCachedOtherPredictions = unstable_cache(
  async () => {
    const supabase = adminSupabase()
    const LOCK_MS = 15 * 60 * 1000
    const now = Date.now()

    const { data: allMatches } = await supabase
      .from("matches")
      .select("id, kickoff_at")

    const lockedIds = (allMatches ?? [])
      .filter((m) => new Date(m.kickoff_at as string).getTime() - LOCK_MS <= now)
      .map((m) => m.id as string)

    if (lockedIds.length === 0) return {} as Record<string, PredRow[]>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPreds: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data: page } = await supabase
        .from("predictions")
        .select("match_id, user_id, home_score, away_score, points_awarded, profile:user_id ( display_name )")
        .is("pool_id", null)
        .in("match_id", lockedIds)
        .range(from, from + 999)
      const rows = page ?? []
      allPreds.push(...rows)
      if (rows.length < 1000) break
    }

    const byMatch: Record<string, PredRow[]> = {}
    for (const p of allPreds) {
      const name = (p.profile as { display_name: string | null } | null)?.display_name ?? "Anónimo"
      ;(byMatch[p.match_id as string] ??= []).push({
        user_id: p.user_id as string,
        name,
        home: p.home_score as number,
        away: p.away_score as number,
        points: (p.points_awarded ?? null) as number | null,
      })
    }

    return byMatch
  },
  ["other-predictions-all"],
  { revalidate: 60, tags: ["predictions"] },
)
