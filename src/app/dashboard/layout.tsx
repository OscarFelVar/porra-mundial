import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardNav } from "@/components/dashboard-nav"
import { Avatar } from "@/components/avatar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single()

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center bg-[#05070b] px-6 py-10 text-white">
      <header className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-tight">
          Porra<span className="text-white/40">Mundial</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 transition hover:bg-white/10"
            title="Mi perfil"
          >
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name ?? user.email}
              size={24}
            />
            <span className="max-w-[10rem] truncate text-xs text-white/60">
              {profile?.display_name ?? user.email}
            </span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <DashboardNav />

      {children}
    </main>
  )
}
