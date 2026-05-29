import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center bg-[#05070b] px-6 py-16 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <span className="text-4xl" aria-hidden>
          🏆
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          ¡Estás dentro!
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Sesión iniciada como{" "}
          <strong className="text-white">{user.email}</strong>
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
