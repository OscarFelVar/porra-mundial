"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { Countdown } from "@/components/countdown";
import { SoccerBall, WorldCupTrophy, ChartBars } from "@/components/icons";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const chips = [
  { Icon: SoccerBall, label: "Pronostica cada partido" },
  { Icon: ChartBars, label: "Suma puntos" },
  { Icon: WorldCupTrophy, label: "Tabla en vivo" },
];

export default function Home() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center bg-[#05070b] px-6 py-20 text-white">
      {/* Capa decorativa (recortada al viewport) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-emerald-500/30 blur-[130px]"
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-cyan-500/25 blur-[130px]"
          animate={{ x: [0, -30, 25, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-6rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-amber-400/15 blur-[120px]"
          animate={{ x: [0, 20, -25, 0], y: [0, -20, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]" />
        <motion.div
          className="absolute left-[8%] top-[18%] hidden opacity-30 sm:block"
          animate={{ y: [0, -16, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src="/icons/balon.png" alt="" width={80} height={80} className="h-20 w-20" />
        </motion.div>
        <motion.div
          className="absolute right-[9%] bottom-[16%] hidden opacity-20 sm:block"
          animate={{ y: [0, 18, 0], rotate: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src="/icons/balon.png" alt="" width={56} height={56} className="h-14 w-14" />
        </motion.div>
      </div>

      {/* Contenido */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex max-w-2xl flex-col items-center gap-6 text-center"
      >
        <motion.div variants={item}>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/icons/trofeo.png"
              alt="Trofeo del Mundial"
              width={104}
              height={104}
              priority
              className="h-24 w-auto drop-shadow-[0_10px_35px_rgba(250,204,21,0.35)]"
            />
          </motion.div>
        </motion.div>

        <motion.span
          variants={item}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Porra entre amigos
        </motion.span>

        <motion.h1
          variants={item}
          className="font-[family-name:var(--font-display)] text-6xl uppercase leading-[0.82] tracking-tight sm:text-8xl md:text-9xl"
        >
          <span className="block">Porra</span>
          <span className="block bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Mundial
          </span>
        </motion.h1>

        <motion.div
          variants={item}
          className="font-[family-name:var(--font-display)] text-3xl tracking-[0.35em] text-white/25 sm:text-5xl"
        >
          2026
        </motion.div>

        <motion.p
          variants={item}
          className="max-w-md text-base leading-relaxed text-white/60 sm:text-lg"
        >
          La porra de la casa. Pronostica los partidos, suma puntos y pelea por
          la cima de la tabla — actualizada en vivo.
        </motion.p>

        <motion.div variants={item} className="flex flex-col items-center gap-3">
          <span className="text-xs uppercase tracking-[0.25em] text-white/40">
            Arranca el 11 de junio
          </span>
          <Countdown />
        </motion.div>

        <motion.div variants={item}>
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-8 py-4 text-base font-semibold text-emerald-950 shadow-[0_0_45px_-8px_rgba(16,185,129,0.7)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_70px_-4px_rgba(16,185,129,0.85)]"
          >
            Entrar a la porra
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.div>

        <motion.ul
          variants={item}
          className="mt-2 flex flex-wrap items-center justify-center gap-3"
        >
          {chips.map(({ Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur"
            >
              <Icon className="h-4 w-4 text-emerald-300" />
              {label}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <footer className="absolute inset-x-0 bottom-4 z-10 px-4 text-center text-[0.7rem] text-white/30">
        Iconos por{" "}
        <a
          href="https://www.flaticon.es/iconos-gratis/copa-mundial"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/55"
        >
          BankSeeNgern
        </a>{" "}
        y{" "}
        <a
          href="https://www.flaticon.es/iconos-gratis/pelota"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/55"
        >
          Freepik
        </a>{" "}
        · Flaticon
      </footer>
    </main>
  );
}
