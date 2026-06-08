import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { supabase } from '@/lib/supabase';
import type { BlogSite, BlogSitePublic } from '@/lib/blog-sites';

export const dynamic = 'force-dynamic';

function toPublic(site: BlogSite): BlogSitePublic {
  const configured =
    site.type === 'supabase'
      ? !!(site.supabase_url && site.supabase_service_key)
      : !!(site.webhook_url)
  return { id: site.id, name: site.name, site_url: site.site_url, type: site.type, configured }
}

export async function GET(request: Request) {
  const authError = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')

  if (!clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  // Emozi Digital (Own) — config from env vars
  if (clientId === 'own') {
    const siteUrl = process.env.BLOG_BASE_URL ?? ''
    const supabaseUrl = process.env.EMOZI_BLOG_SUPABASE_URL ?? ''
    const serviceKey = process.env.EMOZI_BLOG_SUPABASE_SERVICE_ROLE_KEY ?? ''

    if (!siteUrl && !supabaseUrl) {
      return NextResponse.json({ sites: [] })
    }

    const site: BlogSitePublic = {
      id: 'own',
      name: 'Emozi Digital Blog',
      site_url: siteUrl,
      type: 'supabase',
      configured: !!(supabaseUrl && serviceKey),
    }
    return NextResponse.json({ sites: [site] })
  }

  // Client blog sites — read from section_l.blog_sites
  const { data, error } = await supabase
    .from('clients')
    .select('section_l')
    .eq('id', clientId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const blogSites: BlogSite[] = (data?.section_l as any)?.blog_sites ?? []
  return NextResponse.json({ sites: blogSites.map(toPublic) })
}
