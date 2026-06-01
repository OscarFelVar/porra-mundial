import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/profile-form"
import { Reveal } from "@/components/reveal"

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .single()

  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Mi perfil
          </span>
        </h2>
      </Reveal>
      <ProfileForm
        userId={user!.id}
        email={user!.email ?? ""}
        initialName={profile?.display_name ?? null}
        initialAvatar={profile?.avatar_url ?? null}
      />
    </section>
  )
}
