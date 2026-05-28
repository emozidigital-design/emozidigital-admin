import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

const cache = new Map<string, { data: unknown[]; ts: number }>()
const CACHE_TTL = 60_000

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter") ?? "all"

  const cacheKey = `campaign:${params.id}`
  const cached = cache.get(cacheKey)
  let rows: Array<{ email: string; name: string; opened: boolean }>

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    rows = cached.data as typeof rows
  } else {
    // Paginate RPC in chunks to bypass PostgREST project-level max_rows cap
    const PAGE = 1000
    let page = 0
    const allRows: Array<{ email: string; name: string | null; opened: boolean }> = []
    while (true) {
      const { data, error } = await supabaseAdmin
        .rpc("get_campaign_contacts_with_opens", { p_campaign_id: params.id })
        .range(page * PAGE, (page + 1) * PAGE - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) break
      allRows.push(...(data as typeof allRows))
      if (data.length < PAGE) break
      page++
    }

    rows = allRows.map(r => ({ email: r.email ?? "—", name: r.name ?? "", opened: r.opened }))
    cache.set(cacheKey, { data: rows, ts: Date.now() })
  }

  const filtered = filter === "opened"
    ? rows.filter(r => r.opened)
    : filter === "unopened"
    ? rows.filter(r => !r.opened)
    : rows

  return NextResponse.json(filtered)
}
