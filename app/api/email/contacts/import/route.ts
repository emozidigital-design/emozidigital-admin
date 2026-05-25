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
  const delimiter = (formData.get("delimiter") as string) || ","

  if (!clientId || !file) {
    return NextResponse.json({ error: "client_id and file required" }, { status: 400 })
  }

  const skipExisting = formData.get("skip_existing") === "true"
  const columnMapRaw = formData.get("column_map") as string | null
  const columnMap: Record<number, string> = columnMapRaw ? JSON.parse(columnMapRaw) : {}
  const hasColumnMap = Object.keys(columnMap).length > 0

  const text = await file.text()
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have header row + at least one data row" }, { status: 400 })
  }

  const headers = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase())

  let emailIdx: number
  if (hasColumnMap) {
    const emailEntry = Object.entries(columnMap).find(([, v]) => v === "email")
    emailIdx = emailEntry !== undefined ? Number(emailEntry[0]) : -1
  } else {
    emailIdx = headers.indexOf("email")
  }

  if (emailIdx === -1) {
    return NextResponse.json({ error: "CSV must have an 'email' column" }, { status: 400 })
  }

  const nameIdx = hasColumnMap ? -1 : headers.indexOf("name")

  let invalid = 0
  const contacts = lines.slice(1).flatMap(line => {
    const cols = line.split(delimiter).map(c => c.replace(/^"|"$/g, "").trim())
    const email = cols[emailIdx]?.toLowerCase().trim()
    if (!email || !email.includes("@")) {
      invalid++
      return []
    }
    if (hasColumnMap) {
      const row: Record<string, unknown> = { client_id: clientId, email, metadata: {} }
      for (const [colIdxStr, fieldKey] of Object.entries(columnMap)) {
        const val = cols[Number(colIdxStr)]?.trim() ?? null
        if (fieldKey && fieldKey !== "email") row[fieldKey] = val || null
      }
      const firstName = row["first_name"] as string | null
      const lastName = row["last_name"] as string | null
      if (firstName || lastName) {
        row["name"] = [firstName, lastName].filter(Boolean).join(" ") || null
      }
      return [row]
    }
    return [{ client_id: clientId, email, name: nameIdx !== -1 ? cols[nameIdx] : null, metadata: {} }]
  })

  const totalRows = lines.length - 1

  if (contacts.length === 0) {
    return NextResponse.json({ error: "no valid email addresses found" }, { status: 400 })
  }

  // Deduplicate by email — keep last occurrence; prevents "ON CONFLICT DO UPDATE cannot affect a row a second time"
  const dedupedMap = new Map<string, Record<string, unknown>>()
  for (const c of contacts) {
    dedupedMap.set((c.email as string).toLowerCase(), c as Record<string, unknown>)
  }
  const dedupedContacts = Array.from(dedupedMap.values())

  // If skip_existing is set, filter out emails that already exist in the DB
  let finalContacts = dedupedContacts
  let skipped = 0
  if (skipExisting) {
    const existingEmails = new Set<string>()
    const CHUNK = 500
    for (let i = 0; i < dedupedContacts.length; i += CHUNK) {
      const chunk = dedupedContacts.slice(i, i + CHUNK).map(c => (c.email as string).toLowerCase())
      const { data: existing } = await supabaseAdmin
        .from("email_contacts")
        .select("email")
        .eq("client_id", clientId)
        .in("email", chunk)
      ;(existing ?? []).forEach(r => existingEmails.add(r.email.toLowerCase()))
    }
    finalContacts = dedupedContacts.filter(c => !existingEmails.has((c.email as string).toLowerCase()))
    skipped = dedupedContacts.length - finalContacts.length
  }

  if (finalContacts.length === 0) {
    await supabaseAdmin.from("email_import_logs").insert({
      client_id: clientId,
      file_name: file.name,
      delimiter,
      total_rows: totalRows,
      imported: 0,
      invalid,
      tag_ids: tagIds,
      status: "completed",
    })
    return NextResponse.json({ imported: 0, invalid, skipped })
  }

  // Upsert and get back all IDs in one shot — avoids email case-mismatch on lookup
  const { data: upserted, error } = await supabaseAdmin
    .from("email_contacts")
    .upsert(finalContacts, { onConflict: "client_id,email" })
    .select("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If tags were provided, assign all of them to all imported contacts
  if (tagIds.length && upserted?.length) {
    const tagRows = upserted.flatMap((r: { id: string }) =>
      tagIds.map(tid => ({ contact_id: r.id, tag_id: tid }))
    )
    await supabaseAdmin
      .from("email_contact_tags")
      .upsert(tagRows, { onConflict: "contact_id,tag_id" })
  }

  // Write import log
  await supabaseAdmin.from("email_import_logs").insert({
    client_id: clientId,
    file_name: file.name,
    delimiter,
    total_rows: totalRows,
    imported: finalContacts.length,
    invalid,
    tag_ids: tagIds,
    status: "completed",
  })

  return NextResponse.json({ imported: finalContacts.length, invalid, skipped })
}
