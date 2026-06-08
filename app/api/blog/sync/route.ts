import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import type { BlogSite } from '@/lib/blog-sites';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(markdown || '');
  return String(result);
}

async function revalidate(siteUrl: string, secret: string, slug: string) {
  const url = `${siteUrl}/api/revalidate?secret=${secret}&slug=${slug}`;
  await fetch(url, { method: 'POST' }).catch(() => {});
}

async function resolveSiteConfig(clientId: string, siteId: string): Promise<BlogSite | null> {
  if (clientId === 'own') {
    const supabaseUrl = process.env.EMOZI_BLOG_SUPABASE_URL
    const serviceKey = process.env.EMOZI_BLOG_SUPABASE_SERVICE_ROLE_KEY
    const siteUrl = process.env.BLOG_BASE_URL ?? ''
    const revalidateSecret = process.env.EMOZI_BLOG_REVALIDATE_SECRET
    if (!supabaseUrl || !serviceKey) return null
    return {
      id: 'own',
      name: 'Emozi Digital Blog',
      site_url: siteUrl,
      type: 'supabase',
      supabase_url: supabaseUrl,
      supabase_service_key: serviceKey,
      revalidate_secret: revalidateSecret,
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .select('section_l')
    .eq('id', clientId)
    .single()

  if (error || !data) return null

  const blogSites: BlogSite[] = (data.section_l as any)?.blog_sites ?? []
  return blogSites.find(s => s.id === siteId) ?? null
}

export async function POST(request: Request) {
  const authError = await requireAuth()
  if (authError) return authError

  let body: { postData: any; clientId: string; siteId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { postData, clientId, siteId } = body
  if (!postData || !clientId || !siteId) {
    return NextResponse.json({ error: 'postData, clientId, and siteId are required' }, { status: 400 })
  }

  const siteConfig = await resolveSiteConfig(clientId, siteId)
  if (!siteConfig) {
    return NextResponse.json({ error: 'Blog site not found or not configured' }, { status: 404 })
  }

  try {
    if (siteConfig.type === 'supabase') {
      if (!siteConfig.supabase_url || !siteConfig.supabase_service_key) {
        return NextResponse.json({ error: `Blog site "${siteConfig.name}" is missing Supabase credentials` }, { status: 422 })
      }

      const extClient = createClient(siteConfig.supabase_url, siteConfig.supabase_service_key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const htmlContent = await markdownToHtml(postData.content)
      const wordCount = htmlContent.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
      const computedReadTime = Math.max(1, Math.round(wordCount / 200))

      const blogPost: Record<string, unknown> = {
        slug: postData.slug,
        title: postData.title,
        content: htmlContent,
        read_time: computedReadTime,
        excerpt: postData.excerpt || '',
        seo_title: postData.seo_title || postData.title,
        seo_description: postData.seo_description || postData.excerpt || '',
        focus_keyword: postData.focus_keyword || '',
        og_title: postData.seo_title || postData.title,
        og_description: postData.seo_description || postData.excerpt || '',
        category: postData.externalCategory || postData.category,
        tags: postData.tags || [],
        author: postData.author || 'Emozi Digital',
        status: postData.status || 'published',
        canonical_url: `${siteConfig.site_url}/${postData.slug}`,
        published_date: postData.published_at || new Date().toISOString(),
        source: 'emozi-admin',
      }
      if (postData.cover_image_url) {
        blogPost.cover_image = postData.cover_image_url
      }

      const { data, error } = await extClient
        .from('blog_posts')
        .upsert([blogPost], { onConflict: 'slug' })
        .select()
        .single()

      if (error) throw error

      if (siteConfig.revalidate_secret && postData.slug) {
        await revalidate(siteConfig.site_url, siteConfig.revalidate_secret, postData.slug)
      }

      return NextResponse.json({ success: true, site: { id: siteConfig.id, name: siteConfig.name, site_url: siteConfig.site_url }, post: data })

    } else if (siteConfig.type === 'webhook') {
      if (!siteConfig.webhook_url) {
        return NextResponse.json({ error: `Blog site "${siteConfig.name}" is missing webhook URL` }, { status: 422 })
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (siteConfig.webhook_secret) {
        headers['Authorization'] = `Bearer ${siteConfig.webhook_secret}`
      }

      const res = await fetch(siteConfig.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(postData),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`Webhook responded with ${res.status}: ${text.substring(0, 200)}`)
      }

      return NextResponse.json({ success: true, site: { id: siteConfig.id, name: siteConfig.name, site_url: siteConfig.site_url } })
    }

    return NextResponse.json({ error: 'Unknown site type' }, { status: 400 })

  } catch (err: any) {
    console.error(`Blog sync error for site "${siteConfig.name}":`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
