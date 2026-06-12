"use client"

import { useSyncExternalStore } from "react"

type Props = {
  iso: string
  // Opciones de Intl.DateTimeFormat. NO pongas timeZone: lo gestiona el componente.
  // Pásalas como constante a nivel de módulo (referencia estable).
  options: Intl.DateTimeFormatOptions
  className?: string
}

const FALLBACK_TZ = "Europe/Madrid"
const noop = () => () => {}

// Muestra una fecha/hora en la zona horaria DEL DISPOSITIVO del usuario: cada uno ve
// su hora local (España ve España, Colombia ve Colombia, etc.) sin ajustes ni afectar
// a los demás.
//
// useSyncExternalStore da un valor distinto en servidor y cliente SIN "hydration
// mismatch": en SSR usa Madrid (determinista); en el cliente reformatea a la zona local
// del navegador tras hidratar. Para usuarios en España no hay cambio visible.
export function LocalTime({ iso, options, className }: Props) {
  const text = useSyncExternalStore(
    noop,
    // Snapshot en cliente: sin timeZone → Intl usa la zona local del dispositivo.
    () => new Intl.DateTimeFormat("es-ES", options).format(new Date(iso)),
    // Snapshot en servidor (y primer render de hidratación): Madrid, determinista.
    () => new Intl.DateTimeFormat("es-ES", { ...options, timeZone: FALLBACK_TZ }).format(new Date(iso)),
  )

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  )
}
