import { NextResponse } from 'next/server';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { getAgentBazarSupabase } from '@/lib/supabase-agentbazar';

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

export const dynamic = 'force-dynamic';

// List published posts or check if a specific slug exists
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    const { data, error } = await getAgentBazarSupabase()
      .from('blog_posts')
      .select('id, slug, title, category, status, excerpt, cover_image, published_date')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ posts: data ?? [] });
  }

  const { data } = await getAgentBazarSupabase()
    .from('blog_posts')
    .select('id, slug, status')
    .eq('slug', slug)
    .maybeSingle();

  return NextResponse.json({ exists: !!data, post: data });
}

// Publish or update a post on Agent Bazar blog
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const blogPost: Record<string, unknown> = {
      slug: body.slug,
      title: body.title,
      content: await markdownToHtml(body.content),
      excerpt: body.excerpt || '',
      seo_title: body.seo_title || body.title,
      seo_description: body.seo_description || body.excerpt || '',
      focus_keyword: body.focus_keyword || '',
      og_title: body.seo_title || body.title,
      og_description: body.seo_description || body.excerpt || '',
      category: body.externalCategory || body.category,
      tags: body.tags || [],
      author: body.author || 'Agent Bazar',
      status: body.status || 'published',
      canonical_url: `https://blog.agentbazar.in/${body.slug}`,
      published_date: body.published_at || new Date().toISOString(),
      source: 'emozi-admin',
    };
    // Only write cover_image when a non-empty value is provided — prevents
    // accidental overwrites that would clear an existing image.
    if (body.cover_image_url) {
      blogPost.cover_image = body.cover_image_url;
    }

    const { data, error } = await getAgentBazarSupabase()
      .from('blog_posts')
      .upsert([blogPost], { onConflict: 'slug' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post: data });
  } catch (err: any) {
    console.error('Agent Bazar publish error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Remove a post from Agent Bazar blog
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  const { error } = await getAgentBazarSupabase()
    .from('blog_posts')
    .delete()
    .eq('slug', slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
