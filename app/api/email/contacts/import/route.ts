import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const formData = await req.formData()
  const clientId = formData.get("client_id") as string
  const file = formData.get("file") as File | null
  const tagIds = formData.getAll("tag_id") as string[]

  if (!clientId || !file) {
    return NextResponse.json({ error: "client_id and file required" }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have header row + at least one data row" }, { status: 400 })
  }

  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase())
  const emailIdx = headers.indexOf("email")
  const nameIdx = headers.indexOf("name")

  if (emailIdx === -1) {
    return NextResponse.json({ error: "CSV must have an 'email' column" }, { status: 400 })
  }

  const contacts = lines.slice(1).flatMap(line => {
    const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").trim())
    const email = cols[emailIdx]
    if (!email || !email.includes("@")) return []
    return [{ client_id: clientId, email, name: nameIdx !== -1 ? cols[nameIdx] : null, metadata: {} }]
  })

  if (contacts.length === 0) {
    return NextResponse.json({ error: "no valid email addresses found" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("email_contacts")
    .upsert(contacts, { onConflict: "client_id,email" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If tags were provided, assign all of them to all imported contacts
  if (tagIds.length) {
    const emails = contacts.map(c => c.email)
    const { data: rows } = await supabaseAdmin
      .from("email_contacts")
      .select("id")
      .eq("client_id", clientId)
      .in("email", emails)

    if (rows?.length) {
      const tagRows = rows.flatMap(r => tagIds.map(tid => ({ contact_id: r.id, tag_id: tid })))
      await supabaseAdmin
        .from("email_contact_tags")
        .upsert(tagRows, { onConflict: "contact_id,tag_id" })
    }
  }

  return NextResponse.json({ imported: contacts.length })
}
