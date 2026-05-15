import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const OPENAI_API_KEY = process.env.OPENAI_API?.trim()

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 12000)
}

async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Failed to fetch URL: HTTP ${res.status}`)
  const html = await res.text()
  const text = extractTextFromHtml(html)
  if (text.length < 2) {
    throw new Error(
      'Could not extract text from the URL. The page may be JavaScript-rendered — try pasting the content instead.'
    )
  }
  return text
}

const SYSTEM_PROMPT = `You are a professional creative content blog writer specializing in the B2B travel and aviation industry, creating SEO-optimized content for AgentBazar.in — tailored for B2B travel agents, consolidators, corporate travel planners, and airline professionals.

Your task: analyze the provided source content and generate a high-quality blog post. You MUST respond with a valid JSON object ONLY — no markdown fences, no extra text, no preamble.

=== PART 1 — BLOG REWRITE ===

- Conduct deep research to enrich the topic with the latest, accurate information.
- Rewrite in a completely original, human-like tone. Keep core ideas but modify sentence structure, vocabulary, and flow for originality and engagement.
- The result must be free from plagiarism and AI detection flags.
- Format with clear ** at the start and end of headings and subheadings in Markdown.
- Have 3-4 bullet points starting with - to support main points 
- Keep paragraph lengths short (2–4 lines max) for mobile readability.
- End with a "**CONCLUSION**" or "**KEY TAKEAWAY**" section relevant to B2B travel professionals.
- Insert exactly ONE call-to-action at the bottom: "Want more travel updates like this? Follow our updates at blog.agentbazar.in and transform how you support your clients at every stage of travel."

=== PART 2 — SEO OPTIMIZATION ===

1. SEO Title — max 60 characters, includes primary keyword, compelling and click-worthy. Do not exceed 60 characters.
2. Meta Description — 140–160 characters, includes primary keyword, concise summary with a value hook.
3. SEO Keywords — 3–6 high-intent keyword phrases, comma-separated, optimized for B2B travel industry.
4. Author — always exactly "Agent Bazar Editorial Team".
5. Excerpt — SEO-optimized short description of the post, under 255 characters, includes keyword variations naturally.

=== PART 3 - IMAGE CAPTION GENERATION ===

Create 3 advanced, realistic image generation prompts relevant for the above blog post, specifically designed for B2B travel industry. These prompts will generate eye-catching, realistic, and relevant visuals  Note - create an tool image exact size 1200 px * 800 px

=== PART 4 - FAQ'S GENERATION ===

Create 5 frequently asked questions (FAQs) relevant for the above blog post, specifically designed for B2B travel industry.

== REQUIRED JSON RESPONSE FORMAT ===
Return exactly this JSON structure (all fields required):
{
  "title": "Blog post title",
  "slug": "url-friendly-slug-with-hyphens",
  "content": "Full Markdown blog content with ** at the start and end of headings and subheadings",
  "excerpt": "Under 155 chars SEO-optimized description",
  "seo_title": "Max 60 chars SEO title",
  "seo_description": "140-160 chars meta description",
  "focus_keyword": "primary keyword phrase",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "author": "Agent Bazar Editorial Team",
  "category": "One of: Aviation, Visa Updates, Travel Tips, Industry News, Industry Trends, Travel Tools, Cruise, Top Sectors, New Launches, Events & Expo",
  "industry": "Aviation",
  "image_prompts": ["detailed image generation prompt 1", "detailed image generation prompt 2", "detailed image generation prompt 3"],
  "schema_faq": [
    { "question": "FAQ question 1?", "answer": "Detailed answer 1." },
    { "question": "FAQ question 2?", "answer": "Detailed answer 2." },
    { "question": "FAQ question 3?", "answer": "Detailed answer 3." },
    { "question": "FAQ question 4?", "answer": "Detailed answer 4." },
    { "question": "FAQ question 5?", "answer": "Detailed answer 5." }
  ]
}`

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured (OPENAI_API)' }, { status: 500 })
  }

  try {
    const body = (await req.json()) as {
      type: 'url' | 'text'
      url?: string
      content?: string
    }

    let sourceContent = ''

    if (body.type === 'url' && body.url) {
      sourceContent = await fetchUrlContent(body.url)
    } else if (body.type === 'text' && body.content) {
      sourceContent = body.content.substring(0, 12000)
    } else {
      return NextResponse.json(
        { error: 'Provide either a URL (type: "url") or text content (type: "text")' },
        { status: 400 }
      )
    }

    if (!sourceContent || sourceContent.length < 10) {
      return NextResponse.json(
        { error: 'Source content is too short or empty to generate a blog post.' },
        { status: 400 }
      )
    }

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Here is the source content to process into a complete blog post package:\n\n---\n${sourceContent}\n---`,
          },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 8000,
      }),
      signal: AbortSignal.timeout(90000),
    })

    if (!openAiRes.ok) {
      const errText = await openAiRes.text()
      throw new Error(`OpenAI API error ${openAiRes.status}: ${errText.substring(0, 300)}`)
    }

    const aiData = await openAiRes.json()
    const raw = aiData.choices?.[0]?.message?.content

    if (!raw) throw new Error('Empty response from OpenAI')

    let result: any
    try {
      result = JSON.parse(raw)
    } catch {
      throw new Error('OpenAI returned malformed JSON. Please try again.')
    }

    if (!result.title || !result.content) {
      throw new Error('Generated content is missing required fields (title or content). Please try again.')
    }

    // Ensure tags is always an array
    if (!Array.isArray(result.tags)) {
      result.tags = result.tags ? String(result.tags).split(',').map((t: string) => t.trim()) : []
    }

    // Ensure schema_faq is always an array
    if (!Array.isArray(result.schema_faq)) {
      result.schema_faq = []
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error('[ai-generate] Error:', err)
    return NextResponse.json({ error: err.message || 'Content generation failed' }, { status: 500 })
  }
}
