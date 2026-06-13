import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

// All scalar contact columns that can be merged
const MERGEABLE_FIELDS = [
  "name", "first_name", "last_name", "phone", "alternate_phone", "company",
  "street_address", "street_number", "neighborhood", "postal_code", "city",
  "state_province", "country", "tax_number", "language",
  "user_name", "user_type", "agent_name", "agent_id", "agent_registered_date",
  "agent_pancard_no", "agent_gst_number",
]

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
  const mergeExisting = formData.get("merge_existing") === "true"
  const overrideExisting = formData.get("override_existing") === "true"
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
  const invalidRows: { row: number; raw: string; reason: string }[] = []
  const contacts = lines.slice(1).flatMap((line, lineIdx) => {
    const cols = line.split(delimiter).map(c => c.replace(/^"|"$/g, "").trim())
    const email = cols[emailIdx]?.toLowerCase().trim()
    if (!email || !email.includes("@")) {
      invalid++
      invalidRows.push({ row: lineIdx + 2, raw: line, reason: !email ? "Missing email" : "Invalid email format" })
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
    await supabaseAdmin.from("email_import_logs").insert({
      client_id: clientId, file_name: file.name, delimiter,
      total_rows: totalRows, imported: 0, invalid, tag_ids: tagIds,
      status: "completed", invalid_rows: invalidRows,
    })
    return NextResponse.json({ error: "no valid email addresses found" }, { status: 400 })
  }

  // Deduplicate by email — keep last occurrence
  const dedupedMap = new Map<string, Record<string, unknown>>()
  for (const c of contacts) {
    dedupedMap.set((c.email as string).toLowerCase(), c as Record<string, unknown>)
  }
  const dedupedContacts = Array.from(dedupedMap.values())

  // Separate new vs existing contacts — match by email OR agent_id
  const existingEmailSet = new Set<string>()
  const CHUNK = 500
  for (let i = 0; i < dedupedContacts.length; i += CHUNK) {
    const chunk = dedupedContacts.slice(i, i + CHUNK)
    const emailChunk = chunk.map(c => (c.email as string).toLowerCase())
    const { data: existingByEmail } = await supabaseAdmin
      .from("email_contacts")
      .select("email")
      .eq("client_id", clientId)
      .in("email", emailChunk)
    ;(existingByEmail ?? []).forEach(r => existingEmailSet.add(r.email.toLowerCase()))

    // Also check by agent_id if any rows have one
    const agentIds = chunk.map(c => c.agent_id as string | null).filter(Boolean) as string[]
    if (agentIds.length > 0) {
      const { data: existingByAgent } = await supabaseAdmin
        .from("email_contacts")
        .select("email, agent_id")
        .eq("client_id", clientId)
        .in("agent_id", agentIds)
      ;(existingByAgent ?? []).forEach(r => existingEmailSet.add(r.email.toLowerCase()))
    }
  }

  const newContacts = dedupedContacts.filter(c => !existingEmailSet.has((c.email as string).toLowerCase()))
  const duplicateContacts = dedupedContacts.filter(c => existingEmailSet.has((c.email as string).toLowerCase()))
  const skipped = duplicateContacts.length
  let merged = 0
  let overridden = 0

  // ── Override duplicates: replace all non-null CSV values over existing ──
  if (overrideExisting && duplicateContacts.length > 0) {
    for (let i = 0; i < duplicateContacts.length; i += CHUNK) {
      const chunk = duplicateContacts.slice(i, i + CHUNK)
      const emails = chunk.map(c => (c.email as string).toLowerCase())
      const { data: existingRows } = await supabaseAdmin
        .from("email_contacts")
        .select("id, email")
        .eq("client_id", clientId)
        .in("email", emails)
      if (!existingRows?.length) continue
      const idByEmail = new Map(existingRows.map(r => [r.email.toLowerCase(), r.id as string]))
      for (const csvRow of chunk) {
        const id = idByEmail.get((csvRow.email as string).toLowerCase())
        if (!id) continue
        const patch: Record<string, unknown> = {}
        for (const field of MERGEABLE_FIELDS) {
          if (csvRow[field] != null && csvRow[field] !== "") patch[field] = csvRow[field]
        }
        if (Object.keys(patch).length > 0) {
          await supabaseAdmin.from("email_contacts").update(patch).eq("id", id)
        }
      }
      overridden += chunk.length
    }
  }

  // ── Merge duplicates: fill only null/empty fields on existing records ──
  if (mergeExisting && duplicateContacts.length > 0) {
    // Fetch existing records in chunks
    const existingRecords: Record<string, unknown>[] = []
    for (let i = 0; i < duplicateContacts.length; i += CHUNK) {
      const chunk = duplicateContacts.slice(i, i + CHUNK).map(c => (c.email as string).toLowerCase())
      const { data } = await supabaseAdmin
        .from("email_contacts")
        .select("*")
        .eq("client_id", clientId)
        .in("email", chunk)
      existingRecords.push(...(data ?? []))
    }

    const existingByEmail = new Map<string, Record<string, unknown>>()
    for (const r of existingRecords) {
      existingByEmail.set((r.email as string).toLowerCase(), r)
    }

    // Build update payloads: only fields that are null/empty in existing but present in CSV row
    const updates: { id: string; patch: Record<string, unknown> }[] = []
    for (const csvRow of duplicateContacts) {
      const email = (csvRow.email as string).toLowerCase()
      const existing = existingByEmail.get(email)
      if (!existing) continue

      const patch: Record<string, unknown> = {}
      for (const field of MERGEABLE_FIELDS) {
        const csvVal = csvRow[field]
        const existingVal = existing[field]
        // Only overwrite if existing is null/empty and CSV has a non-empty value
        if (csvVal != null && csvVal !== "" && (existingVal == null || existingVal === "")) {
          patch[field] = csvVal
        }
      }

      if (Object.keys(patch).length > 0) {
        updates.push({ id: existing.id as string, patch })
      }
    }

    // Apply updates in small batches
    for (const { id, patch } of updates) {
      await supabaseAdmin.from("email_contacts").update(patch).eq("id", id)
    }
    merged = updates.length
  }

  // ── Import only new contacts (or all if not skipping) ──
  const finalContacts = (skipExisting || mergeExisting || overrideExisting) ? newContacts : dedupedContacts

  let imported = 0
  if (finalContacts.length > 0) {
    const { data: upserted, error } = await supabaseAdmin
      .from("email_contacts")
      .upsert(finalContacts, { onConflict: "client_id,email" })
      .select("id")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    imported = upserted?.length ?? 0

    // Assign tags to newly imported contacts
    if (tagIds.length && upserted?.length) {
      const tagRows = upserted.flatMap((r: { id: string }) =>
        tagIds.map(tid => ({ contact_id: r.id, tag_id: tid }))
      )
      await supabaseAdmin
        .from("email_contact_tags")
        .upsert(tagRows, { onConflict: "contact_id,tag_id" })
    }
  }

  // Assign tags to overridden duplicates (if tags were selected)
  if (overrideExisting && tagIds.length && duplicateContacts.length > 0) {
    const dupEmails = duplicateContacts.map(c => (c.email as string).toLowerCase())
    for (let i = 0; i < dupEmails.length; i += CHUNK) {
      const chunk = dupEmails.slice(i, i + CHUNK)
      const { data: existingRows } = await supabaseAdmin
        .from("email_contacts")
        .select("id")
        .eq("client_id", clientId)
        .in("email", chunk)
      if (existingRows?.length) {
        const tagRows = existingRows.flatMap((r: { id: string }) =>
          tagIds.map(tid => ({ contact_id: r.id, tag_id: tid }))
        )
        await supabaseAdmin
          .from("email_contact_tags")
          .upsert(tagRows, { onConflict: "contact_id,tag_id" })
      }
    }
  }

  // Assign tags to merged duplicates too (if tags were selected)
  if (mergeExisting && tagIds.length && duplicateContacts.length > 0) {
    const dupEmails = duplicateContacts.map(c => (c.email as string).toLowerCase())
    for (let i = 0; i < dupEmails.length; i += CHUNK) {
      const chunk = dupEmails.slice(i, i + CHUNK)
      const { data: existingRows } = await supabaseAdmin
        .from("email_contacts")
        .select("id")
        .eq("client_id", clientId)
        .in("email", chunk)
      if (existingRows?.length) {
        const tagRows = existingRows.flatMap((r: { id: string }) =>
          tagIds.map(tid => ({ contact_id: r.id, tag_id: tid }))
        )
        await supabaseAdmin
          .from("email_contact_tags")
          .upsert(tagRows, { onConflict: "contact_id,tag_id" })
      }
    }
  }

  await supabaseAdmin.from("email_import_logs").insert({
    client_id: clientId,
    file_name: file.name,
    delimiter,
    total_rows: totalRows,
    imported,
    invalid,
    tag_ids: tagIds,
    status: "completed",
    invalid_rows: invalidRows,
  })

  return NextResponse.json({ imported, invalid, skipped, merged, overridden })
}
