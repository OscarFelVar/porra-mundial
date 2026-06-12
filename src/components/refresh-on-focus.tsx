"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// Refresca los datos del servidor (router.refresh) cuando el usuario vuelve a la app
// — la pestaña/PWA pasa a "visible" o la ventana recupera el foco. Así, al reabrir,
// ve marcadores y tabla al día sin recargar a mano (caso típico de resume en caliente
// de la PWA en iOS, donde la página se queda como estaba). Ligero: 1 petición al
// recuperar el foco, con un guard para no refrescar en ráfaga.
export function RefreshOnFocus() {
  const router = useRouter()
  const lastRefresh = useRef(0)

  useEffect(() => {
    function maybeRefresh() {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastRefresh.current < 5000) return // evita ráfagas (toggles rápidos)
      lastRefresh.current = now
      router.refresh()
    }
    document.addEventListener("visibilitychange", maybeRefresh)
    window.addEventListener("focus", maybeRefresh)
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh)
      window.removeEventListener("focus", maybeRefresh)
    }
  }, [router])

  return null
}
