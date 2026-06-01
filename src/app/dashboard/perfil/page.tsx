import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/profile-form"

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
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-white">
        Mi perfil
      </h2>
      <ProfileForm
        userId={user!.id}
        email={user!.email ?? ""}
        initialName={profile?.display_name ?? null}
        initialAvatar={profile?.avatar_url ?? null}
      />
    </section>
  )
}
