"use client"

import { motion } from "motion/react"

// Ambiente visual de la landing (blobs de color + rejilla con máscara),
// extraído para reutilizar en las pantallas internas. Fijo al viewport y
// con opacidades algo más bajas que el hero para no competir con el contenido.
export function StadiumBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070b]"
    >
      <motion.div
        className="absolute -left-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-emerald-500/20 blur-[130px]"
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-cyan-500/15 blur-[130px]"
        animate={{ x: [0, -30, 25, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-6rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-amber-400/10 blur-[120px]"
        animate={{ x: [0, 20, -25, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_70%)]" />
    </div>
  )
}
