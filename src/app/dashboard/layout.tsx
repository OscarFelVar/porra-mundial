import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardNav } from "@/components/dashboard-nav"
import { Avatar } from "@/components/avatar"
import { StadiumBackground } from "@/components/stadium-background"
import { AuthorCredit } from "@/components/author-credit"
import { RefreshOnFocus } from "@/components/refresh-on-focus"
import { HelpCircle, Settings } from "lucide-react"

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
    .select("display_name, avatar_url, is_admin")
    .eq("id", user.id)
    .single()

  return (
    <>
      <RefreshOnFocus />
      <StadiumBackground />
      <main className="relative z-0 flex min-h-[100svh] flex-col items-center px-6 pb-10 text-white">
        <div className="sticky top-0 z-10 mb-8 w-full max-w-2xl bg-gradient-to-b from-[#05070b]/90 to-[#05070b]/60 pb-3 pt-6 backdrop-blur-xl border-b border-white/[0.06]">
        <header className="mb-4 flex w-full items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2" title="Inicio">
            <Image
              src="/icons/trofeo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 drop-shadow-[0_4px_14px_rgba(250,204,21,0.35)]"
            />
            <span className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-tight">
              Porra
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Mundial
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {profile?.is_admin && (
              <Link
                href="/dashboard/admin"
                className="flex items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 p-2 text-amber-200/80 backdrop-blur transition hover:bg-amber-300/20 hover:text-amber-100"
                title="Panel de admin"
              >
                <Settings size={16} />
              </Link>
            )}
            <Link
              href="/dashboard/como-funciona"
              className="flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
              title="Cómo funciona"
            >
              <HelpCircle size={16} />
            </Link>
            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur transition hover:bg-white/10"
              title="Mi perfil"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name ?? user.email}
                size={24}
              />
              <span className="hidden max-w-[8rem] truncate text-xs text-white/60 sm:block">
                {profile?.display_name ?? user.email}
              </span>
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 backdrop-blur transition hover:bg-white/10"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

          <DashboardNav />
        </div>

        {children}

        <footer className="mt-12 pb-1">
          <AuthorCredit />
        </footer>
      </main>
    </>
  )
}
