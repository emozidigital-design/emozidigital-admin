import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim()

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

const DEFAULT_SYSTEM_PROMPT = `You are a professional creative content blog writer. Your task: analyze the provided source content and generate a high-quality, SEO-optimized blog post. You MUST respond with a valid JSON object ONLY — no markdown fences, no extra text, no preamble.

=== PART 1 — BLOG REWRITE ===

- Conduct deep research to enrich the topic with the latest, accurate information.
- Rewrite in a completely original, human-like tone. Keep core ideas but modify sentence structure, vocabulary, and flow for originality and engagement.
- The result must be free from plagiarism and AI detection flags.
- Format with clear ** at the start and end of headings and subheadings in Markdown.
- Have 3-4 bullet points starting with - to support main points.
- Keep paragraph lengths short (2–4 lines max) for mobile readability.
- End with a "**CONCLUSION**" or "**KEY TAKEAWAY**" section.

=== PART 2 — SEO OPTIMIZATION ===

1. SEO Title — max 60 characters, includes primary keyword, compelling and click-worthy.
2. Meta Description — 140–160 characters, includes primary keyword, concise summary with a value hook.
3. SEO Keywords — 3–6 high-intent keyword phrases, comma-separated.
4. Excerpt — SEO-optimized short description of the post, under 255 characters.

=== PART 3 — IMAGE PROMPTS ===

Create 3 advanced, realistic image generation prompts relevant for the blog post. Size: 1200px × 800px.

=== PART 4 — FAQs ===

Create 5 frequently asked questions (FAQs) relevant for the blog post.

=== REQUIRED JSON RESPONSE FORMAT ===
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
  "author": "Editorial Team",
  "category": "Relevant category for the topic",
  "industry": "Relevant industry",
  "image_prompts": ["detailed image generation prompt 1", "detailed image generation prompt 2", "detailed image generation prompt 3"],
  "schema_faq": [
    { "question": "FAQ question 1?", "answer": "Detailed answer 1." },
    { "question": "FAQ question 2?", "answer": "Detailed answer 2." },
    { "question": "FAQ question 3?", "answer": "Detailed answer 3." },
    { "question": "FAQ question 4?", "answer": "Detailed answer 4." },
    { "question": "FAQ question 5?", "answer": "Detailed answer 5." }
  ]
}`

async function resolveClientPrompt(clientId: string): Promise<{ prompt: string; model: string }> {
  const defaultModel = 'openai/gpt-oss-20b'

  if (clientId === 'own') {
    return {
      prompt: process.env.EMOZI_BLOG_PROMPT || DEFAULT_SYSTEM_PROMPT,
      model: process.env.EMOZI_BLOG_MODEL || defaultModel,
    }
  }

  const { data } = await supabase
    .from('clients')
    .select('section_l')
    .eq('id', clientId)
    .single()

  const sL = (data?.section_l as any) ?? {}
  return {
    prompt: sL.blog_prompt || DEFAULT_SYSTEM_PROMPT,
    model: sL.blog_model || defaultModel,
  }
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OpenRouter API key not configured (OPENROUTER_API_KEY)' }, { status: 500 })
  }

  try {
    const body = (await req.json()) as {
      type: 'url' | 'text'
      url?: string
      content?: string
      client_id?: string
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

    const { prompt: systemPrompt, model } = body.client_id
      ? await resolveClientPrompt(body.client_id)
      : { prompt: DEFAULT_SYSTEM_PROMPT, model: 'openai/gpt-5.4-mini' }

    const openAiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://admin.emozidigital.com',
        'X-Title': 'Emozi Digital Admin',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Here is the source content to process into a complete blog post package:\n\n---\n${sourceContent}\n---`,
          },
        ],
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(90000),
    })

    if (!openAiRes.ok) {
      const errText = await openAiRes.text()
      throw new Error(`OpenRouter API error ${openAiRes.status}: ${errText.substring(0, 300)}`)
    }

    const aiData = await openAiRes.json()
    const raw = aiData.choices?.[0]?.message?.content

    if (!raw) throw new Error('Empty response from OpenAI')

    let result: any
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      throw new Error('OpenRouter returned malformed JSON. Please try again.')
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
