export type BlogSiteType = "supabase" | "webhook"

export interface BlogSite {
  id: string
  name: string
  site_url: string
  type: BlogSiteType
  // supabase type
  supabase_url?: string
  supabase_service_key?: string
  revalidate_secret?: string
  // webhook type
  webhook_url?: string
  webhook_secret?: string
}

// Safe public view — no secrets exposed to the browser
export interface BlogSitePublic {
  id: string
  name: string
  site_url: string
  type: BlogSiteType
  configured: boolean
}
