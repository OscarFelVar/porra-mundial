"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { Users, Trophy, Star, BarChart2 } from "lucide-react"

const tabs = [
  { href: "/dashboard",             label: "Grupos",       icon: Users     },
  { href: "/dashboard/pronosticos", label: "Pronósticos",  icon: Trophy    },
  { href: "/dashboard/apuestas",    label: "Apuestas",     icon: Star      },
  { href: "/dashboard/tabla",       label: "Tabla",        icon: BarChart2 },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-8 flex w-full max-w-2xl gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm transition"
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-2 ${
                active ? "font-semibold text-emerald-950" : "text-white/50 hover:text-white"
              }`}
            >
              <Icon size={14} />
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
