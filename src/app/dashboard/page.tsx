import { createClient } from "@/lib/supabase/server"
import { PoolsSection, type Pool } from "@/components/pools-section"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user!.id)
    .single()

  const { data: rows } = await supabase
    .from("pool_members")
    .select(`
      role,
      pool:pools (
        id,
        name,
        invite_code
      )
    `)
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: false })

  const pools: Pool[] = (rows ?? [])
    .filter((r) => r.pool !== null)
    .map((r) => {
      const p = r.pool as unknown as { id: string; name: string; invite_code: string }
      return { id: p.id, name: p.name, invite_code: p.invite_code, role: r.role as "owner" | "member" }
    })

  return <PoolsSection pools={pools} isAdmin={profile?.is_admin ?? false} />
}
