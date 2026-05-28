"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex max-w-2xl flex-col items-center gap-6"
      >
        <span className="text-5xl sm:text-6xl" aria-hidden>
          🏆
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Porra Mundial 2026
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          La porra de Lexsys &amp; SimplyLegal. Pronostica los partidos, suma
          puntos y pelea por la cima de la tabla.
        </p>
        <Button render={<Link href="/login" />} size="lg" className="mt-2">
          Entrar
        </Button>
      </motion.div>
    </main>
  );
}
