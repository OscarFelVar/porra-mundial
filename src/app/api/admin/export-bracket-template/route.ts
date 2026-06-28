import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const TBD = "00000000-0000-0000-0000-000000000001"

function fmt(iso: string) {
  if (!iso) return ""
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso))
}

function teamName(t: { id: string; name: string } | null) {
  return !t || t.id === TBD ? "Por definir" : t.name
}

function esc(s: string) {
  return `"${String(s ?? "").replace(/"/g, '""')}"`
}

export async function GET() {
  // Solo admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Solo admin" }, { status: 403 })

  // Consultar partidos KO con service role (necesario por RLS)
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: matches } = await service
    .from("matches")
    .select("phase, kickoff_at, external_id, home:home_team_id(id,name), away:away_team_id(id,name)")
    .neq("phase", "grupos")
    .order("kickoff_at", { ascending: true })

  type Match = { phase: string; kickoff_at: string; external_id: string | null; home: { id: string; name: string } | null; away: { id: string; name: string } | null }
  const ms = (matches ?? []) as unknown as Match[]

  const byPhase = (phase: string, sortByExternal = false) => {
    const list = ms.filter((m) => m.phase === phase)
    if (sortByExternal) list.sort((a, b) => parseInt(a.external_id ?? "0") - parseInt(b.external_id ?? "0"))
    else list.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
    return list
  }

  type Col = { header: string; desc: string; opts: string }
  const cols: Col[] = []

  const addRound = (label: string, list: Match[]) => {
    list.forEach((m, i) => {
      const h = teamName(m.home)
      const a = teamName(m.away)
      cols.push({
        header: `${label} P${i + 1}`,
        desc:   `${h} vs ${a}  (${fmt(m.kickoff_at)})`,
        opts:   h === a ? h : `${h} | ${a}`,
      })
    })
  }

  addRound("16avos",     byPhase("dieciseisavos", true))
  addRound("Octavos",    byPhase("octavos"))
  addRound("Cuartos",    byPhase("cuartos"))
  addRound("Semis",      byPhase("semifinal"))
  addRound("Final",      byPhase("final"))
  addRound("3er Puesto", byPhase("tercer_puesto"))

  const row1 = ["Email",        ...cols.map((c) => c.header)].map(esc).join(",")
  const row2 = ["Partido →",    ...cols.map((c) => c.desc)  ].map(esc).join(",")
  const row3 = ["Opciones →",   ...cols.map((c) => c.opts)  ].map(esc).join(",")
  const row4 = ["INSTRUCCIÓN: escribe EXACTAMENTE el nombre del equipo tal como aparece en Opciones. Deja en blanco si no pronosticas esa llave.",
                ...cols.map(() => "")].map(esc).join(",")
  const rowE = ["ejemplo@email.com", ...cols.map(() => "")  ].map(esc).join(",")

  const csv = "﻿" + [row1, row2, row3, row4, rowE].join("\r\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plantilla_bracket_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
