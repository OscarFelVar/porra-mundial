// Avatar: muestra la foto si existe; si no, un círculo con la inicial.
export function Avatar({
  src,
  name,
  size = 32,
}: {
  src?: string | null
  name?: string | null
  size?: number
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase()
  const dim = { width: size, height: size }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        style={dim}
        className="shrink-0 rounded-full object-cover ring-1 ring-white/15"
      />
    )
  }

  return (
    <div
      style={dim}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 font-[family-name:var(--font-display)] text-white/80 ring-1 ring-white/15"
    >
      <span style={{ fontSize: size * 0.45 }}>{initial}</span>
    </div>
  )
}
