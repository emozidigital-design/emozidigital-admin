import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { fromdate, todate, sectorlist, pricelogic, markup } = body

  if (!fromdate || !todate || !sectorlist) {
    return NextResponse.json(
      { error: "fromdate, todate, and sectorlist are required" },
      { status: 400 }
    )
  }

  const tokenId = process.env.AGENTBAZAR_FARE_API_TOKEN
  const fareApiCid = process.env.AGENTBAZAR_FARE_API_CID ?? "cms"
  const fareApiAid = process.env.AGENTBAZAR_FARE_API_AID ?? "generateseriesfaredailyemailtemplate"

  if (!tokenId) {
    return NextResponse.json({ error: "Fare API token not configured" }, { status: 500 })
  }

  // Do NOT encode the token — the server expects it as-is (Base64 with + and = chars)
  const apiUrl = `https://admin.agentbazar.in/adminservice.api?tokenid=${tokenId}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55_000)

  // The API expects form-encoded body with a single "requestdata" field containing JSON
  const requestdata = JSON.stringify({
    cid: fareApiCid,
    aid: fareApiAid,
    data: {
      fromdate,
      todate,
      sectorlist,
      pricelogic: pricelogic ?? "live",
      markup: String(markup ?? "0"),
    },
  })

  try {
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ requestdata }).toString(),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "")
      return NextResponse.json(
        { error: `Upstream fare API error: ${upstream.status} ${errText.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get("content-type") ?? ""
    const rawText = await upstream.text()

    // If the response is HTML directly, return as-is
    if (
      contentType.includes("text/html") ||
      rawText.trimStart().startsWith("<!") ||
      rawText.trimStart().startsWith("<html")
    ) {
      return NextResponse.json({ html: rawText })
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(rawText)

      // API returned an error response — surface the message clearly
      const statusCode = data.statuscode ?? data.status_code ?? data.StatusCode
      const message = data.message ?? data.Message ?? data.msg
      const messageInfo = data.messageinfo ?? data.message_info ?? data.MessageInfo

      if (statusCode !== undefined && statusCode !== 200 && statusCode !== "200") {
        return NextResponse.json(
          { error: `Fare API error (${statusCode}): ${messageInfo ?? message ?? rawText.slice(0, 300)}` },
          { status: 502 }
        )
      }

      // Check nested: data.data, data.result, data.response, etc.
      const html: string | undefined =
        data.html ?? data.body ?? data.content ?? data.template ?? data.result ??
        data.data?.html ?? data.data?.body ?? data.data?.content ?? data.response?.html
      if (html && typeof html === "string") {
        return NextResponse.json({ html })
      }

      // No html key found — return full API response for debugging
      return NextResponse.json(
        { error: `Fare API responded but no HTML found. Response: ${rawText.slice(0, 400)}` },
        { status: 502 }
      )
    } catch {
      // Not JSON either — return the raw text as HTML (last resort)
      if (rawText.trim().length > 0) {
        return NextResponse.json({ html: rawText })
      }
      return NextResponse.json(
        { error: "Upstream returned unexpected empty response" },
        { status: 502 }
      )
    }
  } catch (err: unknown) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Fare API timed out" }, { status: 504 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach fare API" },
      { status: 502 }
    )
  }
}
