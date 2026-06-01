// Esqueleto que se muestra al instante al cambiar de pestaña, mientras el
// Server Component carga los datos. Hace que la navegación se sienta inmediata.
export default function DashboardLoading() {
  return (
    <section className="w-full max-w-2xl animate-pulse">
      <div className="mb-5 h-6 w-40 rounded-lg bg-white/10" />
      <ul className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
            <div className="h-4 flex-1 rounded bg-white/10" />
            <div className="h-4 w-12 rounded bg-white/10" />
          </li>
        ))}
      </ul>
    </section>
  )
}
