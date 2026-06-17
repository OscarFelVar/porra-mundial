import { createClient } from "@/lib/supabase/server"
import { PoolsSection, type Pool } from "@/components/pools-section"
import { ScoreCard } from "@/components/score-card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: memberRows }, { data: ownedRows }, { data: settings }] =
    await Promise.all([
      supabase.from("profiles").select("is_admin").eq("id", user!.id).single(),
      supabase
        .from("pool_members")
        .select(`pool:pools ( id, name, invite_code )`)
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false }),
      supabase
        .from("pools")
        .select("id, name, invite_code")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase.from("app_settings").select("digest_pool_id").eq("id", 1).single(),
    ])

  const map = new Map<string, Pool>()
  for (const r of memberRows ?? []) {
    const p = r.pool as unknown as { id: string; name: string; invite_code: string } | null
    if (p) map.set(p.id, { id: p.id, name: p.name, invite_code: p.invite_code, isOwner: false, isMember: true })
  }
  for (const p of ownedRows ?? []) {
    const existing = map.get(p.id)
    if (existing) existing.isOwner = true
    else map.set(p.id, { id: p.id, name: p.name, invite_code: p.invite_code, isOwner: true, isMember: false })
  }

  // Score card: posición del usuario en el grupo principal (digest_pool_id).
  type ScoreData = { rank: number; totalPoints: number; predCount: number; poolName: string }
  let scoreData: ScoreData | null = null
  const digestPoolId = settings?.digest_pool_id as string | null
  if (digestPoolId) {
    const [{ data: lb }, { data: poolInfo }] = await Promise.all([
      supabase.rpc("pool_leaderboard", { p_pool_id: digestPoolId }),
      supabase.from("pools").select("name").eq("id", digestPoolId).single(),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myRow = (lb as any[] | null)?.find((r) => r.user_id === user!.id)
    if (myRow) {
      scoreData = {
        rank:        Number(myRow.rank),
        totalPoints: Number(myRow.total_points),
        predCount:   Number(myRow.pred_count),
        poolName:    poolInfo?.name ?? "",
      }
    }
  }

  return (
    <>
      {scoreData && <ScoreCard {...scoreData} />}
      <PoolsSection pools={[...map.values()]} isAdmin={profile?.is_admin ?? false} />
    </>
  )
}
