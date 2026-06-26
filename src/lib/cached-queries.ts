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
      .eq("phase", "grupos")
      .order("kickoff_at", { ascending: true })
    return data ?? []
  },
  ["matches-all"],
  { revalidate: 60, tags: ["matches"] },
)
