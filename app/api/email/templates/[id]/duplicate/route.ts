import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { data: orig, error: e1 } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("id", params.id)
    .single()

  if (e1 || !orig) return NextResponse.json({ error: "template not found" }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .insert({
      client_id: orig.client_id,
      name: `Copy of ${orig.name}`,
      subject: orig.subject,
      html_body: orig.html_body,
      variables: orig.variables ?? [],
      template_type: orig.template_type ?? "campaign",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
