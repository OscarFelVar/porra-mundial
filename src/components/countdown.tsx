"use client";

import { useEffect, useState } from "react";

// Partido inaugural del Mundial 2026 (11 de junio, hora del centro de México).
const TARGET = new Date("2026-06-11T18:00:00-06:00");

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function getParts(target: Date): Parts {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1_000),
  };
}

export function Countdown() {
  // null en SSR/primer render para evitar desajuste de hidratación.
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(getParts(TARGET));
    const id = setInterval(() => setParts(getParts(TARGET)), 1000);
    return () => clearInterval(id);
  }, []);

  const units: { label: string; value?: number }[] = [
    { label: "Días", value: parts?.days },
    { label: "Horas", value: parts?.hours },
    { label: "Min", value: parts?.minutes },
    { label: "Seg", value: parts?.seconds },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex w-16 flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-3 backdrop-blur sm:w-20"
        >
          <span className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-white sm:text-4xl">
            {u.value === undefined ? "--" : String(u.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[0.65rem] uppercase tracking-widest text-white/45">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
