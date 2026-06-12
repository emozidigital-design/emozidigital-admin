import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim()

export interface ValidationIssue {
  row: number
  field: string
  value: string
  issue: string
  severity: "error" | "warning"
}

export interface ValidationResult {
  score: number          // 0-100
  totalRows: number
  issueCount: number
  issues: ValidationIssue[]
  summary: string
  suggestions: string[]
}

const SYSTEM_PROMPT = `You are a data quality analyst for a contact/email marketing database.
You will be given a sample of contact rows (CSV-mapped to field names) and must evaluate the data quality.

Check each field for:
- Email: valid format, no obvious test/disposable addresses (test@, example.com, etc.)
- Phone/Alternate phone: valid format (can be international), obviously fake numbers (1234567890, 0000000000)
- Name/First name/Last name: not empty if present, not obviously placeholder text
- Postal code: reasonable format for the country if provided
- Country: recognizable country name
- Tax number / GST / PAN card: format plausibility for Indian context (PAN = 10 chars alphanumeric, GST = 15 chars)
- Agent registered date: valid date format
- General: placeholder values like "N/A", "none", "test", "xxx", "123"

Return ONLY valid JSON matching this TypeScript type, no markdown:
{
  "score": number,        // 0-100 quality score
  "totalRows": number,
  "issueCount": number,
  "issues": [
    { "row": number, "field": string, "value": string, "issue": string, "severity": "error"|"warning" }
  ],
  "summary": string,      // 1-2 sentence plain-text summary
  "suggestions": string[] // up to 3 actionable improvement tips
}

severity "error" = data is clearly wrong or will cause import failures
severity "warning" = data looks suspicious or may cause deliverability issues`

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 })
  }

  const body = await req.json()
  // rows: array of objects { rowIndex: number, fields: Record<string, string> }
  const { rows } = body as { rows: { rowIndex: number; fields: Record<string, string> }[] }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array required" }, { status: 400 })
  }

  // Cap to 30 rows to keep token cost low
  const sample = rows.slice(0, 30)

  const userContent = sample
    .map(r => `Row ${r.rowIndex + 1}: ${JSON.stringify(r.fields)}`)
    .join("\n")

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://admin.emozidigital.com",
        "X-Title": "Emozi Digital Admin",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Validate these ${sample.length} contact rows:\n\n${userContent}` },
        ],
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter error ${res.status}: ${errText.substring(0, 200)}`)
    }

    const aiData = await res.json()
    const raw = aiData.choices?.[0]?.message?.content ?? ""

    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
    const result: ValidationResult = JSON.parse(cleaned)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI validation failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
