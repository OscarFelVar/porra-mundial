import { createClient } from "@/lib/supabase/server"
import { PoolsSection, type Pool } from "@/components/pools-section"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: memberRows }, { data: ownedRows }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user!.id).single(),
    // Grupos en los que participo
    supabase
      .from("pool_members")
      .select(`pool:pools ( id, name, invite_code )`)
      .eq("user_id", user!.id)
      .order("joined_at", { ascending: false }),
    // Grupos que administro (soy dueño) — aunque no participe
    supabase
      .from("pools")
      .select("id, name, invite_code")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false }),
  ])

  // Fusionar por id, marcando si participo y/o administro.
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

  return <PoolsSection pools={[...map.values()]} isAdmin={profile?.is_admin ?? false} />
}
