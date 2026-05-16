import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")
  const clientId = searchParams.get("client")

  if (!email || !clientId) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 })
  }

  await supabaseAdmin
    .from("email_contacts")
    .update({ subscribed: false })
    .eq("email", email)
    .eq("client_id", clientId)

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>You've been unsubscribed.</h2><p>You will no longer receive marketing emails.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  )
}
