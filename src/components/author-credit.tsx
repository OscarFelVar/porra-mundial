// Crédito de autoría (personal, sin marca de empresa).
// Cuando haya enlace, envolver el nombre en <a href=…>.
export function AuthorCredit({ className }: { className?: string }) {
  return (
    <p className={`text-[0.7rem] text-white/25 ${className ?? ""}`}>
      Hecho por{" "}
      <span className="font-medium text-white/40">Oscar Felipe Vargas</span>
    </p>
  )
}
