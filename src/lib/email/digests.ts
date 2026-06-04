import { createClient } from "@supabase/supabase-js"

// Envío de "fotos" de pronósticos (evidencia) al correo admin vía Resend.
// El cron (/api/sync) llama a dispatchDigests() cada 15 min. Solo envía cuando
// algo acaba de cerrar y aún no se ha enviado (idempotencia vía email_log).
// El email va a UN solo destinatario (tu inbox) — Apps Script lo reenvía al grupo.
// Inerte si faltan RESEND_API_KEY / DIGEST_FROM_EMAIL / DIGEST_TO_EMAIL.

const RESEND_API = "https://api.resend.com/emails"
const RESEND_BATCH_API = "https://api.resend.com/emails/batch"
const LOCK_MS = 15 * 60 * 1000
const REMINDER_HOUR = 11 // hora (Europe/Madrid) a partir de la cual se manda el recordatorio diario
const APP_PRONOS_URL = "https://porra-mundial-woad.vercel.app/dashboard/pronosticos"

type Sent = { kind: string; ref: string; subject: string }
type Member = { userId: string; name: string; email: string }

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string),
  )

const fmt = (iso: string): string =>
  new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso))

// Lista de destinatarios incrustada para que Apps Script sepa a quién reenviar
// (se mantiene sola con las altas/bajas del grupo). Va en un comentario oculto.
const recipientsComment = (emails: string[]) =>
  `\n<!--PORRA_RECIPIENTS:${JSON.stringify(emails)}-->\n`

async function sendEmail(subject: string, html: string, text: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM_EMAIL,
      to: [process.env.DIGEST_TO_EMAIL],
      subject,
      html,
      text, // parte de texto plano: lleva la lista de destinatarios (Gmail no la altera)
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

// Envío de prueba (desde el panel admin): verifica la conexión con Resend al
// instante. SIN lista de destinatarios → aunque el Apps Script esté activo, no
// reenvía a nadie (no encuentra recipients). Seguro de ejecutar cuando se quiera.
export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_FROM_EMAIL || !process.env.DIGEST_TO_EMAIL) {
    return { ok: false, error: "Faltan variables de entorno de email (RESEND_API_KEY / DIGEST_FROM_EMAIL / DIGEST_TO_EMAIL)" }
  }
  const html =
    "<h2>Prueba de la Porra Mundial 2026</h2>" +
    "<p>Si recibes este correo, Resend está bien configurado y la app puede enviar.</p>" +
    "<p>Este es un correo de prueba: no lleva lista de destinatarios, así que el reenvío automático lo ignora.</p>"
  try {
    await sendEmail("[PORRA] Prueba de envío", html, "Correo de prueba de la Porra (sin destinatarios, no reenviar).")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Prueba de reenvío COMPLETA: envía un correo con la lista de destinatarios =
// solo tu propio correo. El Apps Script lo detecta y te reenvía una copia, así
// verificas toda la cadena (Resend → inbox → Apps Script → reenvío) sin tocar
// deadlines ni grupos, y sin riesgo de molestar a nadie (solo te llega a ti).
export async function sendTestForwardEmail(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_FROM_EMAIL || !process.env.DIGEST_TO_EMAIL) {
    return { ok: false, error: "Faltan variables de entorno de email" }
  }
  const self = process.env.DIGEST_TO_EMAIL as string
  const recipientsText =
    "Prueba de reenvío de la Porra (reenvío gestionado por Apps Script).\n" +
    `PORRA_RECIPIENTS:${JSON.stringify([self])}`
  const html =
    "<h2>Prueba de reenvío — Porra Mundial 2026</h2>" +
    "<p>Si el Apps Script está bien configurado, en unos minutos te llegará una COPIA reenviada " +
    "de este correo (con asunto que empieza por «Porra Mundial 2026 ·»).</p>" +
    recipientsComment([self])
  try {
    await sendEmail("[PORRA] Prueba de reenvío", html, recipientsText)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function dispatchDigests(): Promise<{ sent: Sent[]; skipped?: string }> {
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_FROM_EMAIL || !process.env.DIGEST_TO_EMAIL) {
    return { sent: [], skipped: "email no configurado" }
  }
  const supabase = serviceClient()

  const { data: settings } = await supabase
    .from("app_settings")
    .select("digest_pool_id, special_bets_deadline")
    .eq("id", 1)
    .single()
  const poolId = settings?.digest_pool_id as string | null | undefined
  if (!poolId) return { sent: [], skipped: "sin digest_pool_id" }

  // Miembros del grupo objetivo + sus emails.
  const { data: memberRows } = await supabase
    .from("pool_members")
    .select("user_id, profile:profiles!inner ( display_name, email )")
    .eq("pool_id", poolId)
  const members: Member[] = (memberRows ?? []).map((m) => {
    const p = m.profile as unknown as { display_name: string | null; email: string }
    return { userId: m.user_id as string, name: p.display_name ?? p.email, email: p.email }
  })
  if (members.length === 0) return { sent: [], skipped: "grupo sin miembros" }

  const memberIds = members.map((m) => m.userId)
  const memberEmails = members.map((m) => m.email)
  const recipients = recipientsComment(memberEmails)
  // Misma lista en la parte de texto plano (Gmail nunca la altera; el Apps Script
  // la lee de aquí de forma fiable, con el comentario HTML como respaldo).
  const recipientsText =
    "Correo automático de la Porra (reenvío gestionado por Apps Script).\n" +
    `PORRA_RECIPIENTS:${JSON.stringify(memberEmails)}`

  const { data: logRows } = await supabase.from("email_log").select("kind, ref")
  const sentSet = new Set((logRows ?? []).map((r) => `${r.kind}:${r.ref}`))

  const sent: Sent[] = []
  const nowMs = Date.now()

  // ── 1. Grupos: un email por franja de kickoff, al cerrarse ────────────────
  const { data: gMatches } = await supabase
    .from("matches")
    .select("id, kickoff_at, home:home_team_id ( name ), away:away_team_id ( name )")
    .eq("phase", "grupos")

  const slots = new Map<string, typeof gMatches>()
  for (const m of gMatches ?? []) {
    const k = new Date(m.kickoff_at as string).getTime()
    const locked = nowMs >= k - LOCK_MS
    const tooOld = nowMs > k + 6 * 60 * 60 * 1000 // >6h tras el kickoff: no rellenar histórico
    const ref = m.kickoff_at as string
    if (!locked || tooOld || sentSet.has(`group_slot:${ref}`)) continue
    if (!slots.has(ref)) slots.set(ref, [])
    slots.get(ref)!.push(m)
  }

  for (const [ref, slotMatches] of slots) {
    const matchIds = (slotMatches ?? []).map((m) => m.id as string)
    const { data: preds } = await supabase
      .from("predictions")
      .select("user_id, match_id, home_score, away_score")
      .is("pool_id", null)
      .in("match_id", matchIds)
      .in("user_id", memberIds)
    const byUserMatch = new Map<string, string>()
    for (const p of preds ?? []) byUserMatch.set(`${p.user_id}:${p.match_id}`, `${p.home_score}-${p.away_score}`)

    let html = `<h2>Pronósticos congelados — ${esc(fmt(ref))}</h2>`
    for (const m of slotMatches ?? []) {
      const home = (m.home as unknown as { name: string } | null)?.name ?? "?"
      const away = (m.away as unknown as { name: string } | null)?.name ?? "?"
      html += `<h3>${esc(home)} vs ${esc(away)}</h3>`
      html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">`
      for (const mem of members) {
        const v = byUserMatch.get(`${mem.userId}:${m.id}`) ?? "—"
        html += `<tr><td>${esc(mem.name)}</td><td align="center"><b>${esc(v)}</b></td></tr>`
      }
      html += `</table>`
    }
    html += recipients

    const subject = `[PORRA] Pronósticos — ${fmt(ref)}`
    await sendEmail(subject, html, recipientsText)
    await supabase.from("email_log").insert({ kind: "group_slot", ref })
    sent.push({ kind: "group_slot", ref, subject })
  }

  // ── 2. Cuadro: un único email al cerrarse (15 min antes del 1er 16avo) ─────
  if (!sentSet.has("bracket:main")) {
    const { data: r32 } = await supabase
      .from("matches")
      .select("kickoff_at")
      .eq("phase", "dieciseisavos")
      .order("kickoff_at", { ascending: true })
      .limit(1)
    const first = r32 && r32.length ? new Date(r32[0].kickoff_at as string).getTime() : null
    if (first != null && nowMs >= first - LOCK_MS) {
      const { data: bp } = await supabase
        .from("bracket_predictions")
        .select("user_id, round, slot, predicted_team_id")
        .is("pool_id", null)
        .in("user_id", memberIds)
      const { data: teams } = await supabase.from("teams").select("id, name")
      const teamName = Object.fromEntries((teams ?? []).map((t) => [t.id as string, t.name as string]))
      const byUser = new Map<string, typeof bp>()
      for (const p of bp ?? []) {
        if (!byUser.has(p.user_id)) byUser.set(p.user_id, [])
        byUser.get(p.user_id)!.push(p)
      }

      let html = `<h2>Cuadro de eliminatorias congelado</h2>`
      html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">`
      html += `<tr><td><b>Participante</b></td><td><b>Campeón</b></td><td><b>Llaves</b></td></tr>`
      for (const mem of members) {
        const picks = byUser.get(mem.userId) ?? []
        const champ = (picks ?? []).find((p) => p.round === "final" && p.slot === 0)
        const champName = champ ? (teamName[champ.predicted_team_id as string] ?? "?") : "—"
        html += `<tr><td>${esc(mem.name)}</td><td>${esc(champName)}</td><td align="center">${(picks ?? []).length}</td></tr>`
      }
      html += `</table>` + recipients

      const subject = `[PORRA] Cuadro de eliminatorias`
      await sendEmail(subject, html, recipientsText)
      await supabase.from("email_log").insert({ kind: "bracket", ref: "main" })
      sent.push({ kind: "bracket", ref: "main", subject })
    }
  }

  // ── 3. Especiales: un único email al pasar el deadline ────────────────────
  if (!sentSet.has("special:main")) {
    const deadline = settings?.special_bets_deadline
      ? new Date(settings.special_bets_deadline as string).getTime()
      : null
    if (deadline != null && nowMs >= deadline) {
      const { data: sb } = await supabase
        .from("special_bets")
        .select("user_id, top_scorer, mvp, best_goalkeeper")
        .is("pool_id", null)
        .in("user_id", memberIds)
      const byUser = new Map<string, { top_scorer: string | null; mvp: string | null; best_goalkeeper: string | null }>()
      for (const r of sb ?? []) byUser.set(r.user_id, r)

      let html = `<h2>Apuestas especiales congeladas</h2>`
      html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">`
      html += `<tr><td><b>Participante</b></td><td><b>Goleador</b></td><td><b>MVP</b></td><td><b>Portero</b></td></tr>`
      for (const mem of members) {
        const r = byUser.get(mem.userId)
        html += `<tr><td>${esc(mem.name)}</td><td>${esc(r?.top_scorer ?? "—")}</td><td>${esc(r?.mvp ?? "—")}</td><td>${esc(r?.best_goalkeeper ?? "—")}</td></tr>`
      }
      html += `</table>` + recipients

      const subject = `[PORRA] Apuestas especiales`
      await sendEmail(subject, html, recipientsText)
      await supabase.from("email_log").insert({ kind: "special", ref: "main" })
      sent.push({ kind: "special", ref: "main", subject })
    }
  }

  return { sent }
}

// ── Recordatorio diario de pronósticos pendientes ───────────────────────────
// Una vez al día (a partir de REMINDER_HOUR, hora de Madrid) envía a cada miembro
// de cualquier grupo, DIRECTAMENTE vía Resend (endpoint batch), un correo con los
// partidos abiertos en las próximas 24h que aún no ha pronosticado. Solo escribe a
// quien tiene pendientes. Idempotente por día (email_log kind='daily_reminder').
function madridDateHour(): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) }
}

export async function dispatchDailyReminders(): Promise<{ sent: number; skipped?: string }> {
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_FROM_EMAIL) {
    return { sent: 0, skipped: "email no configurado" }
  }
  const { date, hour } = madridDateHour()
  if (hour < REMINDER_HOUR) return { sent: 0, skipped: "aún no es la hora" }

  const supabase = serviceClient()

  // Idempotencia diaria.
  const { data: log } = await supabase
    .from("email_log").select("ref")
    .eq("kind", "daily_reminder").eq("ref", date).maybeSingle()
  if (log) return { sent: 0, skipped: "ya enviado hoy" }

  // Miembros de CUALQUIER grupo (deduplicados) + email/nombre.
  const { data: memberRows } = await supabase
    .from("pool_members")
    .select("user_id, profile:profiles!inner ( display_name, email )")
  const usersById = new Map<string, { name: string; email: string }>()
  for (const m of memberRows ?? []) {
    const p = m.profile as unknown as { display_name: string | null; email: string }
    if (!usersById.has(m.user_id)) usersById.set(m.user_id, { name: p.display_name ?? p.email, email: p.email })
  }
  if (usersById.size === 0) return { sent: 0, skipped: "sin miembros" }

  // Partidos AÚN ABIERTOS (cierre en el futuro) que arrancan en las próximas 24h.
  const nowMs = Date.now()
  const horizon = nowMs + 24 * 60 * 60 * 1000
  const { data: matchData } = await supabase
    .from("matches")
    .select("id, kickoff_at, home:home_team_id ( name ), away:away_team_id ( name )")
    .order("kickoff_at", { ascending: true })
  const openMatches = (matchData ?? []).filter((m) => {
    const k = new Date(m.kickoff_at as string).getTime()
    return k - LOCK_MS > nowMs && k <= horizon
  })
  if (openMatches.length === 0) return { sent: 0, skipped: "sin partidos próximos abiertos" }

  const matchIds = openMatches.map((m) => m.id as string)
  const userIds = [...usersById.keys()]
  const { data: preds } = await supabase
    .from("predictions")
    .select("user_id, match_id")
    .is("pool_id", null)
    .in("match_id", matchIds)
    .in("user_id", userIds)
  const predicted = new Set((preds ?? []).map((p) => `${p.user_id}:${p.match_id}`))

  const from = process.env.DIGEST_FROM_EMAIL as string
  const batch: { from: string; to: string[]; subject: string; html: string }[] = []
  for (const [uid, u] of usersById) {
    const pending = openMatches.filter((m) => !predicted.has(`${uid}:${m.id}`))
    if (pending.length === 0) continue
    const rows = pending.map((m) => {
      const home = (m.home as unknown as { name: string } | null)?.name ?? "?"
      const away = (m.away as unknown as { name: string } | null)?.name ?? "?"
      return `<li>${esc(home)} vs ${esc(away)} — ${esc(fmt(m.kickoff_at as string))}</li>`
    }).join("")
    const html =
      `<h2>⚽ Te faltan partidos por pronosticar</h2>` +
      `<p>Hola ${esc(u.name)}, tienes ${pending.length} partido(s) sin pronosticar que se juegan pronto:</p>` +
      `<ul>${rows}</ul>` +
      `<p><a href="${APP_PRONOS_URL}">Entra a pronosticar →</a></p>` +
      `<p style="color:#888;font-size:12px">Recuerda: cada partido cierra 15 minutos antes de empezar.</p>`
    batch.push({ from, to: [u.email], subject: "⚽ Te faltan partidos por pronosticar — Porra Mundial", html })
  }
  if (batch.length === 0) return { sent: 0, skipped: "nadie con pendientes" }

  // Resend batch: hasta 100 por llamada → troceamos por si el grupo crece.
  for (let i = 0; i < batch.length; i += 100) {
    const chunk = batch.slice(i, i + 100)
    const res = await fetch(RESEND_BATCH_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) throw new Error(`Resend batch ${res.status}: ${await res.text()}`)
  }

  await supabase.from("email_log").insert({ kind: "daily_reminder", ref: date })
  return { sent: batch.length }
}
