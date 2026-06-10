import { createClient } from "@/lib/supabase/server"
import { type Player } from "@/components/player-autocomplete"

type Row = { name: string; position: string | null; team: { code: string | null } | null }

// Supabase corta en 1000 filas por defecto ("Max rows" del proyecto). Con ~1200
// jugadores, los de nombre tardío (Unai Simón, etc.) se quedaban fuera del
// autocompletar. Paginamos para traerlos todos (orden estable por nombre).
export async function fetchAllPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Player[]> {
  const PAGE = 1000
  const all: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("players")
      .select("name, position, team:teams ( code )")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fetch players: ${error.message}`)
    const rows = (data ?? []) as unknown as Row[]
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all.map((p) => ({
    name:     p.name,
    position: p.position ?? null,
    team:     p.team?.code ?? null,
  }))
}
