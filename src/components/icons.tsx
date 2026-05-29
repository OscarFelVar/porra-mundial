type IconProps = { className?: string };

// Balón de fútbol (patrón clásico de pentágono + costuras).
export function SoccerBall({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="27" />
      <polygon
        points="32,23 40.6,29.2 37.3,39.3 26.7,39.3 23.4,29.2"
        fill="currentColor"
        stroke="none"
      />
      <line x1="32" y1="23" x2="32" y2="6" />
      <line x1="40.6" y1="29.2" x2="58.6" y2="23.4" />
      <line x1="37.3" y1="39.3" x2="48.5" y2="54.6" />
      <line x1="26.7" y1="39.3" x2="15.5" y2="54.6" />
      <line x1="23.4" y1="29.2" x2="5.4" y2="23.4" />
    </svg>
  );
}

// Copa estilo Mundial: globo en lo alto sostenido por dos figuras estilizadas
// sobre una base. Versión propia/estilizada (no es la escultura oficial).
export function WorldCupTrophy({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="15" r="8.5" />
      <path d="M32 6.5C26.8 10.5 26.8 19.5 32 23.5" strokeWidth={1.5} />
      <path d="M32 6.5C37.2 10.5 37.2 19.5 32 23.5" strokeWidth={1.5} />
      <path d="M23.7 12.5H40.3" strokeWidth={1.5} />
      <path d="M28 23.5C22.5 30 24.5 38 29 43.5" />
      <path d="M36 23.5C41.5 30 39.5 38 35 43.5" />
      <path d="M27 43.5H37" />
      <path d="M28.5 43.5L27 50" />
      <path d="M35.5 43.5L37 50" />
      <path d="M24 50H40" />
    </svg>
  );
}

// Barras ascendentes (para "suma puntos").
export function ChartBars({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  );
}
